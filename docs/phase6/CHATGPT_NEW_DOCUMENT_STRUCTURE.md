Prompt pour Claude Sonnet 4.5

Rôle

Tu es un architecte logiciel senior spécialisé en data scientifique (volcanologie / géosciences), avec une forte expertise en MongoDB, API back-end, et front-end data visualization.

Tu travailles sur une application qui associe des échantillons géochimiques à des volcans, avec des exigences fortes de :

transparence scientifique

explicabilité des décisions

rigueur méthodologique

contraintes strictes de taille des documents MongoDB (< 1 KB non compressé)

Contexte

La structure de la base de données MongoDB a été refondue pour :

intégrer un nouveau moteur d’association échantillon–volcan multi-critères

stocker des scores, indicateurs de qualité, flags explicatifs

rester lisible par un humain tout en étant compacte

Le document de référence SAMPLES_FIELD_REFERENCE.md (fourni en argument) décrit :

la nouvelle structure canonique des documents MongoDB

le sens scientifique de chaque champ

ce qui est obligatoire, optionnel, ou calculable côté front

les conventions de nommage et d’abréviation

👉 Ce document fait foi. Toute implémentation doit s’y conformer.

Objectifs de ta mission
1️⃣ Back-end (API / services)

Adapter le back-end pour :

Lire la nouvelle structure MongoDB

Exposer des endpoints clairs permettant :

récupération d’un échantillon

compréhension pourquoi un volcan est associé (ou non)

Gérer correctement les cas :

aucun volcan associé

association ambiguë

association robuste

Ne jamais reconstruire une logique scientifique complexe côté front

Garantir que les champs stockés sont :

nécessaires

non redondants

compatibles avec la limite de taille

👉 Fournir :

structures de DTO / schemas

exemples de payloads API

règles de validation

fallback logiques quand des champs sont absents

2️⃣ Front-end (UI / visualisation)

Adapter le front-end pour :

Exploiter la nouvelle structure matching_metadata

Afficher de manière intuitive et scientifique :

le volcan associé (ou l’absence d’association)

le niveau de confiance

les raisons principales (flags / tokens)

les scores (sans exposer inutilement des floats bruts)

Traduire les tokens compacts (ex: time:low_precision, score:competing_candidates) en :

labels humains

tooltips explicatifs

Gérer correctement :

données manquantes

cas ambigus

scores faibles mais non nuls

👉 Fournir :

mapping champs DB → UI

règles d’affichage conditionnelles

exemples de composants / pseudo-code React ou équivalent

stratégie pour garder une UI explicative sans gonfler la base

Contraintes clés à respecter

❌ Ne pas ajouter de champs non décrits dans SAMPLES_FIELD_REFERENCE.md

❌ Ne pas stocker de texte explicatif long en base

✅ Privilégier :

tokens courts

listes de flags

scores agrégés

✅ Toute logique interprétative lourde doit être :

soit faite en amont

soit au front, à partir de tokens

Livrables attendus

Schéma back-end final (clair et commenté)

Stratégie d’exposition API

Mapping DB → Front

Règles UI pour l’explicabilité scientifique

Checklist de conformité avec les objectifs :

explicabilité

transparence

rigueur

performance

taille des documents

Critère de réussite

Un développeur ou un scientifique doit pouvoir :

comprendre pourquoi un échantillon est associé à un volcan

comprendre le niveau de confiance

identifier les limites et ambiguïtés

sans jamais lire le code du moteur interne

👉 Commence par résumer la structure cible, puis déroule back-end, puis front-end, en t’appuyant explicitement sur SAMPLES_FIELD_REFERENCE.md.