# Instructions pour Jules (Agent d'Ingénierie Logicielle)

Ce document régit la stratégie de test et les conventions de développement pour SimpleBodyGraph. Tout agent intervenant sur cette base de code doit impérativement respecter les règles définies ci-dessous.

## Stratégie de Test Unifiée (Rework de la Stratégie de Test)

Pour éviter d'avoir un système de données de test éparpillé et difficile à maintenir ("un bordel sans nom"), toute la suite de tests est basée sur **un unique Seed Global de données représentant plus de 3 mois de logs et de mesures**.

### 1. Jeu de Données Global (Seed)
Le jeu de données officiel est défini dans `tests/db-helper.js` (`MOCK_LOGS` et `MOCK_MEASUREMENTS`) et reproduit de manière synchrone dans le bloc `vi.hoisted` de `tests/bodyGraph.store.unit.spec.js`.
* **Couverture temporelle** : Mai, Juin, Juillet 2026 (exactement 3 mois).
* **Données de synchronisation/offline** : Le seed global intègre à la fois des logs synchronisés (`synced: true`) et non synchronisés (`synced: false`), de sorte que les tests testant le mode hors-ligne n'ont pas besoin d'insérer dynamiquement des données spécifiques.
* **Paliers d'objectifs par défaut** :
  * Palier 1 : 100 kg, 28% de masse grasse
  * Palier 2 : 95 kg, 25% de masse grasse
  * Palier 3 : 85 kg, 20% de masse grasse

### 2. Règles de Testing Strictes pour Playwright (`tests/db.spec.js` et autres)
* **Pas d'insertion de données arbitraires locales** : Ne définis pas et n'insère pas d'objets ou de tableaux personnalisés dans le corps de tes cas de test individuels.
* **Réutilisation du Seed** : Tous les tests doivent s'exécuter sur la base de données IndexedDB pré-peuplée avec le seed global via `seedIndexedDB(page, MOCK_LOGS, MOCK_MEASUREMENTS)`.
* **Compacte tes tests** : Fais tes assertions directement sur le seed existant. Par exemple :
  * Pour vérifier la récupération ou le tri, interroge le seed et valide les longueurs ou l'ordre chronologique.
  * Pour vérifier une suppression, supprime l'un des IDs présents dans le seed (`j3`, `m3`, etc.) et assure-toi que l'état change par rapport au seed de départ.
  * Pour vérifier une insertion (`saveLog`, `saveMeasurement`), assure-toi que l'élément s'ajoute correctement à la suite du seed existant.

### 3. Règles de Testing Strictes pour Vitest (`tests/bodyGraph.store.unit.spec.js`)
* **Pré-remplissage du Store** : Le store est automatiquement pré-rempli dans le `beforeEach` avec les données du seed global et les 3 paliers par défaut décrits ci-dessus.
* **Pas de redéfinition de tableaux de logs locaux** : N'attribue pas de données de test brutes à `store.logs = [...]` ou `store.measurements = [...]` de manière arbitraire dans chaque test.
* **Filtre ou manipule le seed si nécessaire** : Si un test a besoin d'une tendance particulière ou d'un sous-ensemble (par exemple, pour tester une validation de prise de masse dans `checkAndAutoValidatePaliers`), filtre ou inverse le seed global (ex: `store.logs = [...mockLogs].reverse();`), au lieu de recréer des données à la main.
* **Vérification des calculs** : Teste tes calculs complexes, getters et statistiques directement en te basant sur les valeurs réelles et mathématiquement rigoureuses issues du seed global (ex: Rolling median de fin juillet = `100.50 kg`).

---

En suivant ces consignes, les tests resteront petits, rapides, lisibles, extrêmement robustes et toujours alignés sur une réalité clinique/physique cohérente de 3 mois de suivi.
