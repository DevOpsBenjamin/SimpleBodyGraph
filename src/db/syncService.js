import { supabase } from '../supabase';
import { openDB, bulkWrite, STORE_LOGS, STORE_MEASUREMENTS } from './core';
import { getAllLogs, getUnsyncedLogs, getPendingDeletions, clearPendingDeletions } from './logsStore';
import { getAllMeasurements, getUnsyncedMeasurements, getPendingMeasurementDeletions, clearPendingMeasurementDeletions } from './measurementsStore';

async function syncLogDeletions(userId) {
  const deletions = await getPendingDeletions(userId);
  if (deletions.length > 0) {
    const deletionIds = deletions.map(d => d.id);
    const { error: delError } = await supabase
      .from('logs')
      .delete()
      .in('id', deletionIds);

    if (!delError) {
      await clearPendingDeletions(deletionIds);
      console.log('Synced deletions successfully:', deletionIds);
    } else {
      console.error('Error syncing deletions to remote:', delError);
      throw delError;
    }
  }
}

async function syncUnsyncedLogs(userId) {
  const unsynced = await getUnsyncedLogs(userId);
  if (unsynced.length > 0) {
    const recordsToPush = unsynced.map(log => ({
      id: log.id,
      date: log.date,
      mass: Number(log.mass),
      body_fat: Number(log.body_fat),
      user_id: userId
    }));

    const { error: pushError } = await supabase
      .from('logs')
      .upsert(recordsToPush);

    if (!pushError) {
      for (const log of unsynced) {
        log.synced = true;
      }
      await bulkWrite(STORE_LOGS, { puts: unsynced });
      console.log('Pushed unsynced logs successfully:', unsynced);
    } else {
      console.error('Error pushing unsynced logs to remote:', pushError);
      throw pushError;
    }
  }
  return unsynced;
}

async function syncRemoteLogs(userId, unsynced) {
  const { data: remoteLogs, error: pullError } = await supabase
    .from('logs')
    .select('*')
    .order('date', { ascending: false });

  if (!pullError && remoteLogs) {
    const currentLocalLogs = await getAllLogs(userId);
    const unsyncedMap = new Map(unsynced.map(l => [l.id, l]));

    const puts = [];
    const deletes = [];

    for (const rLog of remoteLogs) {
      if (!unsyncedMap.has(rLog.id)) {
        puts.push({
          ...rLog,
          synced: true
        });
      }
    }

    const remoteIds = new Set(remoteLogs.map(l => l.id));
    for (const lLog of currentLocalLogs) {
      if (lLog.synced && !remoteIds.has(lLog.id) && !unsyncedMap.has(lLog.id)) {
        deletes.push(lLog.id);
      }
    }

    await bulkWrite(STORE_LOGS, { puts, deletes });
    console.log('Pulled remote logs successfully.');
  } else if (pullError) {
    console.error('Error pulling remote logs:', pullError);
    throw pullError;
  }
}

async function syncMeasurementDeletions(userId) {
  const mDeletions = await getPendingMeasurementDeletions(userId);
  if (mDeletions.length > 0) {
    const mDeletionIds = mDeletions.map(d => d.id);
    const { error: mDelError } = await supabase
      .from('measurements')
      .delete()
      .in('id', mDeletionIds);

    if (!mDelError) {
      await clearPendingMeasurementDeletions(mDeletionIds);
      console.log('Synced measurement deletions successfully:', mDeletionIds);
    } else {
      console.error('Error syncing measurement deletions:', mDelError);
      throw mDelError;
    }
  }
}

async function syncUnsyncedMeasurements(userId) {
  const unsyncedM = await getUnsyncedMeasurements(userId);
  if (unsyncedM.length > 0) {
    const recordsToPush = unsyncedM.map(log => ({
      id: log.id,
      date: log.date,
      waist: log.waist !== null && log.waist !== '' ? Number(log.waist) : null,
      chest: log.chest !== null && log.chest !== '' ? Number(log.chest) : null,
      arms: log.arms !== null && log.arms !== '' ? Number(log.arms) : null,
      thighs: log.thighs !== null && log.thighs !== '' ? Number(log.thighs) : null,
      user_id: userId
    }));

    const { error: mPushError } = await supabase
      .from('measurements')
      .upsert(recordsToPush);

    if (!mPushError) {
      for (const log of unsyncedM) {
        log.synced = true;
      }
      await bulkWrite(STORE_MEASUREMENTS, { puts: unsyncedM });
      console.log('Pushed unsynced measurements successfully:', unsyncedM);
    } else {
      console.error('Error pushing unsynced measurements:', mPushError);
      throw mPushError;
    }
  }
  return unsyncedM;
}

async function syncRemoteMeasurements(userId, unsyncedM) {
  const { data: remoteM, error: mPullError } = await supabase
    .from('measurements')
    .select('*')
    .order('date', { ascending: false });

  if (!mPullError && remoteM) {
    const currentLocalM = await getAllMeasurements(userId);
    const unsyncedMMap = new Map(unsyncedM.map(l => [l.id, l]));

    const puts = [];
    const deletes = [];

    for (const rLog of remoteM) {
      if (!unsyncedMMap.has(rLog.id)) {
        puts.push({
          ...rLog,
          synced: true
        });
      }
    }

    const remoteMIds = new Set(remoteM.map(l => l.id));
    for (const lLog of currentLocalM) {
      if (lLog.synced && !remoteMIds.has(lLog.id) && !unsyncedMMap.has(lLog.id)) {
        deletes.push(lLog.id);
      }
    }

    await bulkWrite(STORE_MEASUREMENTS, { puts, deletes });
    console.log('Pulled remote measurements successfully.');
  } else if (mPullError) {
    console.error('Error pulling remote measurements:', mPullError);
    throw mPullError;
  }
}

// Synchronization Manager
export async function syncLogs(userId = 'guest') {
  if (userId === 'guest') {
    return { success: false, reason: 'guest_user_no_sync' };
  }
  if (!navigator.onLine || !supabase) {
    return { success: false, reason: 'offline_or_no_supabase' };
  }

  try {
    await openDB();

    // --- 1. Sync Logs ---
    await syncLogDeletions(userId);
    const unsynced = await syncUnsyncedLogs(userId);
    await syncRemoteLogs(userId, unsynced);

    // --- 2. Sync Measurements ---
    await syncMeasurementDeletions(userId);
    const unsyncedM = await syncUnsyncedMeasurements(userId);
    await syncRemoteMeasurements(userId, unsyncedM);

    return { success: true };
  } catch (error) {
    console.error('Sync process failed:', error);
    return { success: false, error };
  }
}
