<template>
  <div class="max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6 animate-fade-in pb-28">
    <!-- Header Bar with Back Button -->
    <div class="flex items-center justify-between pb-4 border-b border-gray-800/80">
      <div class="flex items-center gap-3">
        <button
          type="button"
          @click="closeSettings"
          class="p-2.5 rounded-xl bg-gray-900/80 border border-gray-800 text-gray-300 hover:text-white hover:border-gray-700 active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-2 text-xs font-semibold shadow-sm"
          title="Retour au Tableau de bord"
        >
          <ArrowLeft class="w-4 h-4 text-violet-400" />
          <span class="hidden xs:inline">Dashboard</span>
        </button>
        <div>
          <h2 class="text-lg sm:text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
            Paramètres & Configuration
          </h2>
          <p class="text-xs text-gray-400">Personnalisez vos objectifs, profil corporel BIA et périphériques BLE.</p>
        </div>
      </div>

      <div class="flex items-center gap-2">
        <span class="text-[10px] px-2.5 py-1 rounded-xl bg-violet-600/10 border border-violet-500/20 text-violet-300 font-semibold select-none hidden sm:inline-block">
          SimpleBodyGraph v1.2.0
        </span>
      </div>
    </div>

    <!-- Navigation Tabs / Sub-Sections -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 p-1.5 rounded-2xl bg-gray-900/80 border border-gray-800/80">
      <button
        type="button"
        @click="activeSubTab = 'goals'"
        :class="[
          'py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
          activeSubTab === 'goals'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        ]"
      >
        <Target class="w-4 h-4" />
        <span>Objectifs</span>
      </button>

      <button
        type="button"
        @click="activeSubTab = 'profile'"
        :class="[
          'py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
          activeSubTab === 'profile'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        ]"
      >
        <User class="w-4 h-4" />
        <span>Profil (BIA)</span>
      </button>

      <button
        type="button"
        @click="activeSubTab = 'devices'"
        :class="[
          'py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
          activeSubTab === 'devices'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        ]"
      >
        <Bluetooth class="w-4 h-4" />
        <span>Balances BLE</span>
      </button>

      <button
        type="button"
        @click="activeSubTab = 'data'"
        :class="[
          'py-2.5 px-3 rounded-xl text-xs font-bold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
          activeSubTab === 'data'
            ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/20'
            : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800/50'
        ]"
      >
        <Database class="w-4 h-4" />
        <span>Données</span>
      </button>
    </div>

    <!-- Feedback Toasts / Messages -->
    <div v-if="errorMsg" class="text-xs text-rose-400 font-medium bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2">
      <AlertTriangle class="w-4 h-4 shrink-0 text-rose-400" />
      <span>{{ errorMsg }}</span>
    </div>
    <div v-if="successMsg" class="text-xs text-emerald-400 font-medium bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl flex items-center gap-2">
      <CheckCircle class="w-4 h-4 shrink-0 text-emerald-400" />
      <span>{{ successMsg }}</span>
    </div>

    <!-- ======================================================== -->
    <!-- SECTION 1 : OBJECTIFS & PALIERS                          -->
    <!-- ======================================================== -->
    <div v-show="activeSubTab === 'goals'" class="space-y-6">
      <div class="glass-card p-5 sm:p-6 rounded-2xl space-y-5 border border-gray-800/80">
        <div>
          <h3 class="text-sm font-bold text-violet-400 uppercase tracking-wider">Objectifs par Paliers</h3>
          <p class="text-xs text-gray-400 mt-1">Définissez une trajectoire progressive avec des paliers successifs de poids et masse grasse.</p>
        </div>

        <form @submit.prevent="handleSaveGoals" class="space-y-4">
          <div v-if="paliers.length === 0" class="text-center py-8 text-xs text-gray-500 border border-dashed border-gray-800 rounded-2xl space-y-2">
            <Target class="w-8 h-8 text-gray-600 mx-auto mb-1" />
            <p class="text-gray-400 font-medium">Aucun palier d'objectif configuré</p>
            <p class="text-[11px] text-gray-600">Ajoutez votre premier palier pour commencer le suivi de votre progression.</p>
          </div>

          <div v-else class="space-y-3">
            <div 
              v-for="(palier, index) in paliers" 
              :key="palier.id || index"
              :class="[
                'p-4 rounded-2xl border transition-all duration-200 space-y-3',
                palier.validated 
                  ? 'bg-emerald-950/20 border-emerald-800/30' 
                  : 'bg-gray-950/60 border-gray-800'
              ]"
            >
              <div class="flex items-center justify-between">
                <span class="text-xs font-bold text-gray-300 flex items-center gap-2">
                  <span class="w-5 h-5 rounded-full bg-violet-600/20 text-violet-400 border border-violet-500/30 flex items-center justify-center text-[10px]">
                    {{ index + 1 }}
                  </span>
                  Palier {{ index + 1 }}
                </span>

                <div class="flex items-center gap-2">
                  <button
                    type="button"
                    @click="toggleValidation(index)"
                    :class="[
                      'px-2.5 py-1 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 cursor-pointer border',
                      palier.validated
                        ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
                    ]"
                  >
                    <CheckCircle class="w-3.5 h-3.5" :class="{ 'text-emerald-400': palier.validated }" />
                    <span>{{ palier.validated ? 'Validé' : 'Non validé' }}</span>
                  </button>

                  <button
                    type="button"
                    @click="removePalier(index)"
                    class="p-1.5 text-gray-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
                    title="Supprimer ce palier"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div class="space-y-1">
                  <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Poids Cible (kg)</label>
                  <div class="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="1"
                      placeholder="ex: 85.0"
                      v-model="palier.mass"
                      class="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-gray-900 border border-gray-800 focus:border-violet-500/50 text-xs text-white"
                    />
                    <span class="absolute inset-y-0 right-3.5 flex items-center text-xs text-gray-500 font-semibold pointer-events-none">kg</span>
                  </div>
                </div>

                <div class="space-y-1">
                  <label class="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">Masse Grasse Cible (%) <span class="text-gray-600 font-normal">(optionnel)</span></label>
                  <div class="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      placeholder="ex: 15.0"
                      v-model="palier.fat"
                      class="w-full pl-3.5 pr-8 py-2.5 rounded-xl bg-gray-900 border border-gray-800 focus:border-violet-500/50 text-xs text-white"
                    />
                    <span class="absolute inset-y-0 right-3 flex items-center text-xs text-gray-500 font-semibold pointer-events-none">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              @click="addPalier"
              class="flex-1 py-3 px-4 rounded-xl bg-gray-900 hover:bg-gray-800 active:scale-[0.98] text-gray-200 border border-gray-800 text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Plus class="w-4 h-4 text-violet-400" />
              <span>Ajouter un palier</span>
            </button>

            <button
              type="submit"
              :disabled="goalsLoading"
              class="flex-1 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white font-semibold text-xs transition-all duration-200 cursor-pointer shadow-lg shadow-violet-500/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {{ goalsLoading ? 'Sauvegarde...' : 'Sauvegarder les Paliers' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- SECTION 2 : PROFIL CORPOREL (BIA)                        -->
    <!-- ======================================================== -->
    <div v-show="activeSubTab === 'profile'" class="space-y-6">
      <div class="glass-card p-5 sm:p-6 rounded-2xl space-y-5 border border-gray-800/80">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-violet-400 uppercase tracking-wider">Profil Corporel (Bio-Impédance BIA)</h3>
            <p class="text-xs text-gray-400 mt-1">Données requises pour le calcul précis de votre masse grasse et impédances sur balance connectée.</p>
          </div>
          <span 
            :class="[
              'text-[10px] px-2.5 py-1 rounded-xl font-bold border select-none',
              isProfileActive
                ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
                : 'bg-gray-800/60 border-gray-700 text-gray-400'
            ]"
          >
            {{ isProfileActive ? '🟢 Profil Actif' : '⚪ Profil Inactif' }}
          </span>
        </div>

        <!-- Educational Alert -->
        <div class="p-4 bg-indigo-950/30 border border-indigo-800/30 rounded-2xl flex gap-3 items-start">
          <Sparkles class="w-5 h-5 text-indigo-400 mt-0.5 flex-shrink-0" />
          <div class="text-xs leading-relaxed text-gray-300">
            <strong class="text-indigo-300">⚠️ Règle du calcul BIA :</strong> Les calculs de composition corporelle (masse grasse, impédances) nécessitent <span class="text-white font-semibold">l'ensemble des 3 informations (Sexe, Âge et Taille)</span>. Si vous ne souhaitez pas les renseigner, le profil reste désactivé.
          </div>
        </div>

        <form @submit.prevent="handleSaveProfile" class="space-y-5">
          <!-- Sexe Selection -->
          <div class="space-y-2">
            <label class="block text-xs font-bold text-gray-400 uppercase tracking-wider">
              Sexe biologique <span class="text-rose-400">*</span>
            </label>
            <div class="grid grid-cols-2 gap-3">
              <button
                type="button"
                @click="profileForm.gender = 'male'"
                :class="[
                  'py-3 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
                  profileForm.gender === 'male'
                    ? 'bg-blue-600/20 border-blue-500/50 text-blue-300 shadow-md shadow-blue-500/10'
                    : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                ]"
              >
                <span class="text-base">👨</span>
                <span>Homme</span>
              </button>

              <button
                type="button"
                @click="profileForm.gender = 'female'"
                :class="[
                  'py-3 px-3 rounded-xl border text-xs font-semibold transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer',
                  profileForm.gender === 'female'
                    ? 'bg-pink-600/20 border-pink-500/50 text-pink-300 shadow-md shadow-pink-500/10'
                    : 'bg-gray-950/60 border-gray-800 text-gray-400 hover:text-gray-200 hover:border-gray-700'
                ]"
              >
                <span class="text-base">👩</span>
                <span>Femme</span>
              </button>
            </div>
          </div>

          <!-- Birthdate & Age -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <label for="profile-birthdate" class="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Date de naissance <span class="text-rose-400">*</span>
                </label>
                <span v-if="calculatedAge !== null" class="text-xs font-bold text-violet-400 bg-violet-600/15 border border-violet-500/20 px-2.5 py-0.5 rounded-lg">
                  {{ calculatedAge }} ans
                </span>
              </div>
              <input
                id="profile-birthdate"
                type="date"
                required
                v-model="profileForm.birthDate"
                class="w-full px-3.5 py-2.5 rounded-xl bg-gray-950 border border-gray-800 focus:border-violet-500/50 text-xs text-white"
              />
            </div>

            <!-- Height (cm) -->
            <div class="space-y-2">
              <label for="profile-height" class="block text-xs font-bold text-gray-400 uppercase tracking-wider">
                Taille (en cm) <span class="text-rose-400">*</span>
              </label>
              <div class="relative">
                <input
                  id="profile-height"
                  type="number"
                  min="50"
                  max="250"
                  step="1"
                  required
                  placeholder="ex: 175"
                  v-model="profileForm.height"
                  class="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-gray-950 border border-gray-800 focus:border-violet-500/50 text-xs text-white"
                />
                <span class="absolute inset-y-0 right-3.5 flex items-center text-xs text-gray-500 font-semibold pointer-events-none">
                  cm
                </span>
              </div>
            </div>
          </div>

          <div class="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              v-if="isProfileActive || profileForm.gender || profileForm.birthDate || profileForm.height"
              @click="handleResetProfile"
              :disabled="profileLoading"
              class="py-3 px-4 rounded-xl bg-gray-900 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 text-gray-400 border border-gray-800 text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Trash2 class="w-4 h-4" />
              <span>Effacer / Réinitialiser</span>
            </button>

            <button 
              type="submit"
              :disabled="profileLoading || !isProfileComplete"
              :class="[
                'flex-1 py-3 px-4 rounded-xl font-semibold text-xs transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer',
                isProfileComplete
                  ? 'bg-violet-600 hover:bg-violet-500 active:scale-[0.98] text-white shadow-lg shadow-violet-500/20'
                  : 'bg-gray-800/80 text-gray-500 cursor-not-allowed border border-gray-700/50'
              ]"
            >
              {{ profileLoading ? 'Enregistrement...' : 'Sauvegarder le Profil BIA' }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- SECTION 3 : BALANCES CONNECTÉES (BLE)                    -->
    <!-- ======================================================== -->
    <div v-show="activeSubTab === 'devices'" class="space-y-6">
      <div class="glass-card p-5 sm:p-6 rounded-2xl space-y-6 border border-gray-800/80">
        <div class="flex items-center justify-between">
          <div>
            <h3 class="text-sm font-bold text-violet-400 uppercase tracking-wider">Balances Connectées (BLE)</h3>
            <p class="text-xs text-gray-400 mt-1">Scannez et associez votre balance Bluetooth pour vos pesées automatiques.</p>
          </div>

          <!-- Native / Web Badge -->
          <div 
            :class="[
              'px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 select-none',
              isNativePlatform 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            ]"
          >
            <Smartphone class="w-3.5 h-3.5" />
            <span>{{ isNativePlatform ? 'APK Natif BLE' : 'Mode Web (APK requis)' }}</span>
          </div>
        </div>

        <!-- Compatibility Notice when on Web -->
        <div v-if="!isNativePlatform" class="p-4 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-3">
          <div class="flex items-start gap-3">
            <Smartphone class="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div class="space-y-1.5 text-xs text-gray-300 leading-relaxed">
              <p><strong class="text-amber-300">📱 Application Native Requise :</strong> Pour des raisons de compatibilité matérielle (écoute des trames publicitaires passives, négociation MTU étendue et protocole d'authentification propriétaire), la détection et la synchronisation automatique des balances connectées fonctionnent exclusivement via l'application native Android.</p>
              <p class="text-[11px] text-gray-400">Installez l'APK officiel sur votre smartphone pour connecter et synchroniser directement votre balance.</p>
            </div>
          </div>
          <a
            href="https://github.com/DevOpsBenjamin/SimpleBodyGraph/releases/latest/download/SimpleBodyGraph.apk"
            class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-200 text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Download class="w-4 h-4" />
            <span>Télécharger l'APK Android Officiel</span>
          </a>
        </div>

        <!-- Paired Devices List -->
        <div class="space-y-3">
          <span class="text-xs font-bold text-gray-400 uppercase tracking-wider block">Balances enregistrées</span>
          
          <div v-if="store.pairedDevices.length === 0" class="p-6 bg-gray-950/40 border border-dashed border-gray-800 rounded-2xl text-center space-y-2">
            <Scale class="w-8 h-8 text-gray-600 mx-auto mb-1" />
            <p class="text-xs text-gray-300 font-medium">Aucune balance associée</p>
            <p class="text-[11px] text-gray-500">Lancez la recherche ci-dessous pour détecter et associer votre balance.</p>
          </div>

          <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div 
              v-for="device in store.pairedDevices" 
              :key="device.id || device.deviceId"
              class="p-4 bg-gray-950/80 border border-violet-500/30 rounded-2xl flex items-center justify-between shadow-lg shadow-violet-500/5"
            >
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-violet-400">
                  <Scale class="w-5 h-5" />
                </div>
                <div>
                  <h4 class="text-xs font-bold text-white leading-tight flex items-center gap-2">
                    {{ device.name }}
                    <span class="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">Associée</span>
                  </h4>
                  <p class="text-[10px] text-gray-400 font-mono mt-0.5">MAC : {{ device.mac || device.deviceId }}</p>
                </div>
              </div>

              <button
                type="button"
                @click="handleRemoveDevice(device.deviceId)"
                class="p-2 rounded-xl hover:bg-rose-500/10 text-gray-500 hover:text-rose-400 transition-colors cursor-pointer"
                title="Dissocier cette balance"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <!-- Scan Action Box -->
        <div class="p-5 bg-gray-950/80 border border-gray-800 rounded-2xl space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 class="text-xs font-bold text-white">Recherche d'appareils Bluetooth à proximité</h4>
              <p class="text-[11px] text-gray-400 mt-0.5">Allumez votre balance ou montez brièvement dessus pour la réveiller.</p>
            </div>

            <button
              type="button"
              @click="toggleScan"
              :class="[
                'py-2.5 px-4 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-2',
                isScanning
                  ? 'bg-rose-600/20 text-rose-300 border border-rose-500/30 hover:bg-rose-600/30'
                  : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-500/20'
              ]"
            >
              <RefreshCw v-if="isScanning" class="w-4 h-4 animate-spin" />
              <Search v-else class="w-4 h-4" />
              <span>{{ isScanning ? 'Arrêter la recherche' : 'Rechercher (BLE)' }}</span>
            </button>
          </div>

          <!-- Scan feedback error -->
          <div v-if="bleErrorMsg" class="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl flex items-center gap-2">
            <AlertTriangle class="w-4 h-4 shrink-0" />
            <span>{{ bleErrorMsg }}</span>
          </div>

          <!-- Scanning active animation indicator -->
          <div v-if="isScanning && discoveredDevices.length === 0" class="py-6 text-center space-y-2">
            <div class="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p class="text-xs text-violet-300 font-medium">Recherche Bluetooth en cours...</p>
            <p class="text-[10px] text-gray-500">Posez le pied sur la balance pour activer son émetteur BLE</p>
          </div>

          <!-- Discovered Devices List -->
          <div v-if="discoveredDevices.length > 0" class="space-y-2.5 pt-3 border-t border-gray-900">
            <span class="text-xs font-bold text-gray-400 uppercase tracking-wider block">Appareils trouvés ({{ discoveredDevices.length }})</span>
            
            <div 
              v-for="dev in discoveredDevices" 
              :key="dev.deviceId"
              class="p-3.5 bg-gray-900 border border-gray-800 hover:border-violet-500/30 rounded-xl flex items-center justify-between transition-all"
            >
              <div class="flex items-center gap-3">
                <div class="w-9 h-9 rounded-xl bg-violet-600/15 border border-violet-500/20 flex items-center justify-center text-violet-400">
                  <Bluetooth class="w-4.5 h-4.5" />
                </div>
                <div>
                  <div class="flex items-center gap-2 flex-wrap">
                    <p class="text-xs font-bold text-white">{{ dev.name }}</p>
                    <span 
                      v-if="getDeviceDriver(dev)"
                      class="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold"
                    >
                      Compatible
                    </span>
                    <span 
                      v-else
                      class="text-[9px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 select-none"
                    >
                      Non supporté
                    </span>
                  </div>
                  <p class="text-[10px] text-gray-400 font-mono mt-0.5">{{ dev.deviceId }} <span v-if="dev.rssi" class="text-gray-500">({{ dev.rssi }} dBm)</span></p>
                </div>
              </div>

              <template v-if="!isDevicePaired(dev.deviceId)">
                <button
                  type="button"
                  v-if="getDeviceDriver(dev)"
                  @click="handlePairDevice(dev)"
                  class="py-2 px-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-colors cursor-pointer shadow-md shadow-violet-500/10"
                >
                  Associer
                </button>
                <button
                  type="button"
                  v-else
                  disabled
                  class="py-2 px-3.5 rounded-xl bg-gray-800/80 border border-gray-700/50 text-gray-500 text-xs font-semibold cursor-not-allowed select-none"
                  title="Pilote non disponible pour ce modèle"
                >
                  Non supporté
                </button>
              </template>
              <span v-else class="text-xs text-emerald-400 font-semibold px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                Déjà associée
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- SECTION 4 : SAUVEGARDE & MIGRATION                       -->
    <!-- ======================================================== -->
    <div v-show="activeSubTab === 'data'" class="space-y-6">
      <div class="glass-card p-5 sm:p-6 rounded-2xl space-y-5 border border-gray-800/80">
        <div>
          <h3 class="text-sm font-bold text-violet-400 uppercase tracking-wider">Sauvegarde & Migration</h3>
          <p class="text-xs text-gray-400 mt-1">Exportez ou restaurez l'intégralité de vos données (pesées, mensurations, paliers, profil BIA et balances) au format JSON.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            @click="handleExport"
            :disabled="exportLoading"
            class="py-3.5 px-4 rounded-2xl bg-gray-950 hover:bg-gray-900 active:scale-[0.98] text-gray-200 hover:text-white transition-all duration-200 text-xs font-semibold cursor-pointer border border-gray-800 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Download class="w-4 h-4 text-violet-400" />
            <span>{{ exportLoading ? 'Exportation...' : 'Exporter toutes les données (JSON)' }}</span>
          </button>

          <button
            type="button"
            @click="triggerFileInput"
            :disabled="importLoading"
            class="py-3.5 px-4 rounded-2xl bg-gray-950 hover:bg-gray-900 active:scale-[0.98] text-gray-200 hover:text-white transition-all duration-200 text-xs font-semibold cursor-pointer border border-gray-800 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
          >
            <Upload class="w-4 h-4 text-violet-400" />
            <span>{{ importLoading ? 'Restauration...' : 'Restaurer depuis un fichier (JSON)' }}</span>
          </button>
          <input
            ref="fileInputRef"
            type="file"
            accept=".json,application/json"
            class="hidden"
            @change="handleFileImport"
          />
        </div>

        <div class="p-4 bg-gray-950/60 border border-gray-800/80 rounded-2xl flex items-start gap-3">
          <Database class="w-5 h-5 text-violet-400 shrink-0 mt-0.5" />
          <div class="text-xs text-gray-300 leading-relaxed">
            Le fichier de sauvegarde JSON contient l'historique complet de vos pesées, l'ensemble de vos mensurations, vos paliers d'objectifs, votre profil corporel BIA et vos balances connectées configurées.
          </div>
        </div>
      </div>
    </div>

    <!-- Assistant d'Appairage Interactif BLE -->
    <ScalePairingModal
      ref="pairingModalRef"
      :is-open="isPairingModalOpen"
      :device="selectedDeviceForPairing"
      @close="closePairingModal"
      @paired="onDeviceSuccessfullyPaired"
      @retry="startPairingWorkflow"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { 
  ArrowLeft, Trash2, Plus, CheckCircle, Download, Upload, 
  Target, User, Scale, Database, Sparkles, Bluetooth, Search, RefreshCw, Smartphone, AlertTriangle 
} from 'lucide-vue-next';
import { useBodyGraphStore, calculateAge } from '../stores/bodyGraph';
import { BleService } from '../services/ble/bleService';
import { ScaleManager } from '../services/ble/scaleManager';
import ScalePairingModal from './ScalePairingModal.vue';

const store = useBodyGraphStore();

const activeSubTab = ref('goals'); // 'goals' | 'profile' | 'devices' | 'data'

// Goals state
const paliers = ref([]);
const goalsLoading = ref(false);

// Profile state
const profileForm = ref({
  gender: null,
  birthDate: '',
  height: ''
});
const profileLoading = ref(false);

const calculatedAge = computed(() => {
  return calculateAge(profileForm.value.birthDate);
});

const isProfileComplete = computed(() => {
  const h = Number(profileForm.value.height);
  return (
    (profileForm.value.gender === 'male' || profileForm.value.gender === 'female') &&
    !!profileForm.value.birthDate &&
    calculatedAge.value !== null &&
    calculatedAge.value >= 5 &&
    calculatedAge.value <= 120 &&
    !isNaN(h) &&
    h >= 50 &&
    h <= 250
  );
});

const isProfileActive = computed(() => {
  return (
    (store.profile?.gender === 'male' || store.profile?.gender === 'female') &&
    !!store.profile?.birthDate &&
    store.profile?.height !== null &&
    store.profile?.height !== undefined
  );
});

// BLE state
const isScanning = ref(false);
const discoveredDevices = ref([]);
const bleErrorMsg = ref('');
const isNativePlatform = computed(() => BleService.isNative());

// Pairing Modal state
const pairingModalRef = ref(null);
const isPairingModalOpen = ref(false);
const selectedDeviceForPairing = ref(null);

// Feedback
const errorMsg = ref('');
const successMsg = ref('');

const loadFromStore = () => {
  paliers.value = store.paliers.map(p => ({
    id: p.id || crypto.randomUUID(),
    mass: p.mass !== null && p.mass !== undefined ? p.mass : '',
    fat: p.fat !== null && p.fat !== undefined ? p.fat : '',
    validated: !!p.validated
  }));

  profileForm.value = {
    gender: store.profile?.gender ?? null,
    birthDate: store.profile?.birthDate ?? '',
    height: store.profile?.height !== null && store.profile?.height !== undefined ? store.profile.height : ''
  };

  discoveredDevices.value = [];
  isScanning.value = false;
  bleErrorMsg.value = '';
};

onMounted(() => {
  loadFromStore();
});

watch(() => store.activeView, (view) => {
  if (view === 'settings') {
    loadFromStore();
  } else {
    if (isScanning.value) {
      BleService.stopScan();
      isScanning.value = false;
    }
  }
});

const closeSettings = () => {
  if (isScanning.value) {
    BleService.stopScan();
    isScanning.value = false;
  }
  store.activeView = 'dashboard';
};

// Goals Handlers
const addPalier = () => {
  paliers.value.push({
    id: crypto.randomUUID(),
    mass: '',
    fat: '',
    validated: false
  });
};

const removePalier = (index) => {
  paliers.value.splice(index, 1);
};

const toggleValidation = (index) => {
  paliers.value[index].validated = !paliers.value[index].validated;
};

const handleSaveGoals = async () => {
  goalsLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  const formattedPaliers = [];
  for (let i = 0; i < paliers.value.length; i++) {
    const p = paliers.value[i];
    const massVal = p.mass === '' ? null : Number(p.mass);
    const fatVal = p.fat === '' ? null : Number(p.fat);

    if (massVal !== null && (isNaN(massVal) || massVal <= 0)) {
      errorMsg.value = `Palier ${i + 1} : Le poids doit être un nombre positif`;
      goalsLoading.value = false;
      return;
    }
    if (fatVal !== null && (isNaN(fatVal) || fatVal < 0 || fatVal > 100)) {
      errorMsg.value = `Palier ${i + 1} : Le taux de graisse doit être compris entre 0 et 100%`;
      goalsLoading.value = false;
      return;
    }

    formattedPaliers.push({
      id: p.id,
      mass: massVal,
      fat: fatVal,
      validated: p.validated
    });
  }

  try {
    await store.updatePaliers(formattedPaliers);
    successMsg.value = 'Objectifs sauvegardés avec succès !';
    setTimeout(() => {
      successMsg.value = '';
    }, 2500);
  } catch (error) {
    errorMsg.value = 'Échec de la sauvegarde des paliers : ' + error.message;
  } finally {
    goalsLoading.value = false;
  }
};

// Profile Handlers
const handleSaveProfile = async () => {
  profileLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    if (!profileForm.value.gender || (profileForm.value.gender !== 'male' && profileForm.value.gender !== 'female')) {
      errorMsg.value = 'Veuillez sélectionner votre sexe biologique (Homme ou Femme).';
      profileLoading.value = false;
      return;
    }

    if (!profileForm.value.birthDate || calculatedAge.value === null || calculatedAge.value < 5 || calculatedAge.value > 120) {
      errorMsg.value = 'Veuillez renseigner une date de naissance valide.';
      profileLoading.value = false;
      return;
    }

    const hVal = Number(profileForm.value.height);
    if (!profileForm.value.height || isNaN(hVal) || hVal < 50 || hVal > 250) {
      errorMsg.value = 'Veuillez saisir une taille valide (entre 50 et 250 cm).';
      profileLoading.value = false;
      return;
    }

    await store.updateProfile({
      gender: profileForm.value.gender,
      birthDate: profileForm.value.birthDate,
      height: hVal
    });

    successMsg.value = 'Profil BIA sauvegardé avec succès !';
    setTimeout(() => {
      successMsg.value = '';
    }, 2500);
  } catch (error) {
    errorMsg.value = 'Échec de la sauvegarde du profil : ' + error.message;
  } finally {
    profileLoading.value = false;
  }
};

const handleResetProfile = async () => {
  profileLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  try {
    profileForm.value = {
      gender: null,
      birthDate: '',
      height: ''
    };
    await store.updateProfile({
      gender: null,
      birthDate: null,
      height: null
    });
    successMsg.value = 'Profil BIA effacé et désactivé.';
    setTimeout(() => {
      successMsg.value = '';
    }, 2500);
  } catch (error) {
    errorMsg.value = 'Échec de la réinitialisation : ' + error.message;
  } finally {
    profileLoading.value = false;
  }
};

// BLE Handlers
const getDeviceDriver = (device) => {
  if (!device) return null;
  return ScaleManager.getDriverForDevice(device);
};

const isDevicePaired = (deviceId) => {
  return store.pairedDevices.some(d => d.deviceId === deviceId || d.mac === deviceId);
};

const toggleScan = async () => {
  bleErrorMsg.value = '';
  if (isScanning.value) {
    await BleService.stopScan();
    isScanning.value = false;
    return;
  }

  discoveredDevices.value = [];
  isScanning.value = true;

  try {
    await BleService.startScan((dev) => {
      if (!dev || !dev.name || !dev.name.trim() || dev.name === 'Appareil Bluetooth inconnu') return;
      const exists = discoveredDevices.value.some(d => d.deviceId === dev.deviceId);
      if (!exists) {
        discoveredDevices.value.push(dev);
      }
    });
  } catch (err) {
    isScanning.value = false;
    bleErrorMsg.value = err.message || 'Échec de la recherche Bluetooth.';
  }
};

const handlePairDevice = (device) => {
  selectedDeviceForPairing.value = device;
  isPairingModalOpen.value = true;
  if (isScanning.value) {
    BleService.stopScan();
    isScanning.value = false;
  }
  startPairingWorkflow(device);
};

const startPairingWorkflow = async (device) => {
  if (!device) return;
  pairingModalRef.value?.startPairingSession();

  const profileData = {
    gender: store.profile?.gender || 'male',
    age: calculateAge(store.profile?.birthDate) || 30,
    heightCm: store.profile?.height || 175,
    lastWeightKg: store.latestLog?.mass || null
  };

  try {
    await ScaleManager.pairDevice(device, profileData, {
      onStep: (stepInfo) => {
        pairingModalRef.value?.updateStep(stepInfo);
      },
      onRequestMac: async (defaultMac) => {
        return await pairingModalRef.value?.requestMacInput(defaultMac);
      },
      onSuccess: async (pairedData) => {
        await store.savePairedDevice(pairedData);
        pairingModalRef.value?.setSuccess(pairedData);
      },
      onError: (err) => {
        pairingModalRef.value?.setError(err);
      }
    });
  } catch (err) {
    pairingModalRef.value?.setError(err);
  }
};

const closePairingModal = () => {
  isPairingModalOpen.value = false;
  selectedDeviceForPairing.value = null;
};

const onDeviceSuccessfullyPaired = (device) => {
  successMsg.value = `Balance "${device?.name || 'HUAWEI Scale 3'}" associée avec succès !`;
  setTimeout(() => {
    successMsg.value = '';
  }, 2500);
};

const handleRemoveDevice = async (deviceId) => {
  try {
    await store.removePairedDevice(deviceId);
    successMsg.value = 'Balance dissociée.';
    setTimeout(() => {
      successMsg.value = '';
    }, 2000);
  } catch (err) {
    errorMsg.value = 'Échec de la suppression : ' + (err.message || err);
  }
};

// Export / Import Handlers
const fileInputRef = ref(null);
const exportLoading = ref(false);
const importLoading = ref(false);

const handleExport = async () => {
  exportLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';
  try {
    const data = await store.exportData();
    const totalLogs = data.logs?.length || 0;
    const totalM = data.measurements?.length || 0;
    successMsg.value = `Export réussi (${totalLogs} pesées, ${totalM} mensurations, profil inclus) !`;
  } catch (err) {
    errorMsg.value = "Échec de l'export : " + (err.message || err);
  } finally {
    exportLoading.value = false;
  }
};

const triggerFileInput = () => {
  if (fileInputRef.value) {
    fileInputRef.value.value = '';
    fileInputRef.value.click();
  }
};

const handleFileImport = async (event) => {
  const file = event.target?.files?.[0];
  if (!file) return;

  importLoading.value = true;
  errorMsg.value = '';
  successMsg.value = '';

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const content = e.target.result;
      const res = await store.importData(content);
      successMsg.value = `Import réussi : ${res.importedLogsCount} pesées, ${res.importedMeasurementsCount} mensurations restaurées !`;
      loadFromStore();
    } catch (err) {
      errorMsg.value = "Échec de l'import : " + (err.message || err);
    } finally {
      importLoading.value = false;
    }
  };
  reader.onerror = () => {
    errorMsg.value = 'Erreur lors de la lecture du fichier.';
    importLoading.value = false;
  };
  reader.readAsText(file);
};
</script>

<style scoped>
.animate-fade-in {
  animation: fadeIn 0.2s ease-out forwards;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
