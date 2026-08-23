# Glossaire du Domaine (Domain Model)

Ce document rassemble les définitions canoniques des concepts métier utilisés dans SimpleBodyGraph.

## Entités & Données Métier

### Log (Entrée de suivi)
Une entrée de suivi corporel quotidienne rattachée à un utilisateur. Elle contient obligatoirement une date civile (`YYYY-MM-DD`), une masse corporelle en kilogrammes (`mass`) et une estimation du taux de masse grasse en pourcentage (`body_fat`). Lorsqu'elle est générée par une pesée Bluetooth, elle peut contenir des métriques physiologiques complémentaires (rythme cardiaque, données brutes d'impédance, horodatage précis).

### Measurement (Mensuration)
Une entrée de suivi morphologique centimétrique enregistrant les mensurations corporelles (tour de taille, poitrine, bras, cuisses) pour une date donnée.

### BIA Profile (Profil de Bio-impédance)
L'ensemble des paramètres physiologiques de l'utilisateur (sexe biologique, date de naissance/âge, taille en centimètres) nécessaires aux algorithmes d'analyse corporelle des balances connectées par bio-impédance électrique (BIA).

### Palier (Objectif par étapes)
Un objectif intermédiaire défini par un seuil de masse et de pourcentage de masse grasse, validé automatiquement lorsqu'une tendance hebdomadaire stable (médiane glissante) atteint le seuil requis.

## Périphériques Connectés & Bluetooth (BLE)

### ScaleManager
Le registre et orchestrateur central responsable de la découverte des balances Bluetooth, de la sélection du pilote adapté, de la gestion du cycle de vie de la connexion et de la transmission des événements de pesée à l'application.

### ScaleDriver (Pilote de balance)
Composant d'adaptation dédié à une famille de balances spécifique (ex: HUAWEI Scale 3 / Pro), encapsulant le protocole matériel, le chiffrement, le décodage des trames télémétriques, ainsi que **la définition et le pilotage des étapes d'appairage (UX callbacks & instructions spécifiques)** pour que l'interface reste générique et agnostique du matériel.

### Paired Scale (Balance associée)
Une balance reconnue et persistée dans l'application, identifiée par son adresse MAC physique, son identifiant système et ses identifiants de session utilisateur.

### HUID (Huawei User ID)
Identifiant de compte utilisateur virtuel attribué à la balance lors de l'appairage initial pour segmenter et autoriser les profils utilisateurs.

### Validation Weigh-in (Pesée de référence initiale)
La première pesée physique réalisée immédiatement après l'enregistrement du profil lors du processus d'appairage (Mode 1), indispensable pour que la balance étalonne et accepte le profil utilisateur pour les pesées quotidiennes ultérieures.
