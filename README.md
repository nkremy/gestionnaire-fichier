# Gestionnaire de fichiers

## Présentation

Le **Gestionnaire de fichiers** est un microservice indépendant chargé de centraliser le stockage des fichiers échangés avec les clients.

Il complète le projet principal **Agent WhatsApp** en prenant en charge une responsabilité unique : **la sauvegarde et la récupération des fichiers**.

L'objectif est de séparer la gestion des médias de la logique métier de l'agent afin de rendre l'architecture plus modulaire, plus maintenable et plus évolutive.

---

# Rôle dans l'architecture

Le projet principal est un agent connecté à WhatsApp capable d'interagir automatiquement avec les clients grâce à un LLM.

Deux sources peuvent produire des fichiers :

- les fichiers envoyés par les clients via WhatsApp ;
- les fichiers envoyés manuellement depuis l'interface d'administration lorsque le LLM est désactivé.

Dans les deux cas, le projet principal ne stocke pas directement les fichiers.

Il les transmet au **Gestionnaire de fichiers**, qui est responsable de leur conservation.

---

# Cas d'utilisation

## 1. Fichier reçu depuis WhatsApp

Le client envoie une image, une vidéo, un document ou un message vocal.

Le projet principal reçoit le média puis l'envoie au Gestionnaire de fichiers.

Le Gestionnaire de fichiers :

- crée le dossier du client si nécessaire ;
- sauvegarde le fichier sur le disque ;
- génère une référence unique ;
- renvoie cette référence au projet principal.

Le projet principal peut ensuite enregistrer uniquement cette référence dans sa base de données.

---

## 2. Fichier envoyé depuis l'interface d'administration

L'application dispose d'une interface permettant à un opérateur humain de prendre la main sur une conversation.

Lorsque le LLM est désactivé, l'opérateur peut envoyer directement des messages et des fichiers au client.

Avant l'envoi vers WhatsApp, le fichier est transmis au Gestionnaire de fichiers afin d'être sauvegardé.

Ainsi, tous les fichiers échangés avec un client sont conservés de manière centralisée, quelle que soit leur origine.

---

# Responsabilités

Le Gestionnaire de fichiers est responsable de :

- sauvegarder les fichiers reçus ;
- retrouver un fichier à partir de sa référence ;
- organiser les fichiers par client ;
- générer une référence unique pour chaque média ;
- déterminer automatiquement le type MIME lors de la récupération.

Il ne gère pas :

- les conversations ;
- les messages ;
- les utilisateurs ;
- les décisions du LLM ;
- les traitements liés à WhatsApp.

Ces responsabilités appartiennent au projet principal.

---

# API

## POST /ranger-fichier

Permet de sauvegarder un fichier.

Entrée :

- numéro du client ;
- contenu encodé en Base64 ;
- type MIME.

Sortie :

- succès de l'opération ;
- référence unique du fichier.

---

## POST /retrouver-fichier

Permet de récupérer un fichier précédemment sauvegardé.

Entrée :

- référence du fichier.

Sortie :

- contenu Base64 ;
- type MIME ;
- état de l'opération.

---

## GET /health

Permet de vérifier que le service fonctionne correctement.

---

# Organisation du stockage

Chaque client possède son propre dossier.

À l'intérieur de ce dossier, chaque fichier est enregistré avec un identifiant UUID afin d'éviter tout conflit de nom.

Exemple :

```
stockage/
└── 237690000000/
    ├── 6d63c8....jpg
    ├── a891df....mp3
    └── 0f12ab....mp4
```

La référence retournée au projet principal correspond au chemin logique du fichier.

Exemple :

```
237690000000/6d63c8....jpg
```

---

# Avantages

- séparation claire des responsabilités ;
- architecture modulaire ;
- stockage centralisé des médias ;
- simplification du projet principal ;
- réutilisable par plusieurs applications ;
- maintenance facilitée ;
- possibilité de remplacer ultérieurement le stockage local par un stockage cloud sans modifier le projet principal.
