# Mission : évaluation du travail des équipes et des étudiants — Programmation agentique

## 1. Objectif général

Tu es un agent chargé d'analyser un dépôt GitHub utilisé par les étudiants d'un cours de **programmation agentique** afin de préparer une évaluation détaillée du travail réalisé, à la fois collectivement et individuellement.

Les étudiants travaillent en équipes sur un projet logiciel. Ils doivent notamment :
- proposer et discuter des idées dans les espaces de discussion GitHub ;
- décomposer le travail en tâches pertinentes et créer des issues ;
- organiser et suivre les tâches à l'aide du kanban du projet ;
- s'assigner les tâches et coordonner leurs contributions ;
- développer le code dans des branches ;
- réaliser des commits et soumettre des pull requests (PR) vers `main` ;
- intégrer, tester et faire évoluer les différentes fonctionnalités du projet.

Le README décrit la composition des équipes et le périmètre fonctionnel attendu pour chacune d'elles.

Ton objectif est de produire trois livrables :
1. un **rapport global** sur le projet et les différences entre les équipes ;
2. un **rapport détaillé par équipe** ;
3. un **rapport individuel par étudiant**, avec une synthèse comparative quantifiée.

L'évaluation doit être factuelle, explicable, équitable et vérifiable. Chaque conclusion importante doit être appuyée par des éléments observables dans GitHub.

**Principe fondamental : évaluer le travail et sa valeur, pas seulement son volume apparent.**

Dix petites PR cosmétiques ou mécaniques ne valent pas nécessairement une PR qui implémente une fonctionnalité complexe. De même, construire un plan de travail cohérent, identifier les bonnes tâches, clarifier les dépendances, discuter des choix techniques ou intégrer le travail des autres peut représenter une contribution importante, même si cette contribution se traduit par peu de lignes de code.

Ne confonds jamais activité GitHub, volume de code, difficulté, qualité, avancement et contribution individuelle.

---

## 2. Phase préalable : découverte et collecte des données

Avant toute évaluation, explore le dépôt et identifie les sources d'information disponibles.

### 2.1. Structure et périmètre

Examine notamment :
- le README principal et les éventuels README des équipes ;
- la liste des équipes, leurs membres et leurs responsabilités ;
- les objectifs fonctionnels et techniques assignés à chaque équipe ;
- l'architecture du projet, les répertoires et les modules ;
- les éventuelles consignes d'évaluation, spécifications et critères d'acceptation.

Construis une liste explicite des fonctionnalités et responsabilités attendues pour chaque équipe.

Ne présume pas que toutes les équipes ont une charge équivalente : cela doit être évalué à partir de leur périmètre réel.

### 2.2. Historique du travail

Collecte, dans la mesure où les permissions et les fonctionnalités GitHub le permettent :
- les issues ouvertes, fermées et encore en cours ;
- leur contenu, leur auteur, leurs assignations, leurs labels, leurs dates et leurs relations avec d'autres issues ;
- les discussions, commentaires et échanges de conception ;
- les PR ouvertes, fermées, fusionnées ou abandonnées ;
- les commits, leurs auteurs, leurs dates et leurs changements ;
- les branches encore actives et les branches fusionnées ;
- l'état actuel du kanban et, si possible, son historique ;
- les revues de code, commentaires de revue et demandes de modifications ;
- les tests, la documentation et les éventuels workflows d'intégration continue.

Examine également le code présent dans `main`, les branches pertinentes et les PR non fusionnées.

Si l'historique du kanban, certaines discussions ou d'autres données ne sont pas accessibles, indique-le explicitement. Ne prétends pas avoir observé une information que GitHub ne permet pas de retrouver.

### 2.3. Période d'évaluation

Détermine la période effectivement observable. Utilise les dates disponibles dans le dépôt et les consignes du cours.

Distingue :
- le travail réalisé pendant la période évaluée ;
- le travail antérieur éventuellement réutilisé ;
- les contributions postérieures à la date de clôture, si celle-ci est connue.

Si la date de clôture ou la période attendue ne peut pas être déterminée, signale-le avant de tirer des conclusions définitives.

### 2.4. Identité des contributeurs

Établis une correspondance prudente entre les identités GitHub, les auteurs de commits et les étudiants du README.

Attention aux alias Git, aux adresses de courriel différentes, aux commits réalisés par des bots, aux contributions automatisées et aux squash merges.

Ne fusionne pas deux identités sur la seule base d'une ressemblance de nom. Signale les identités incertaines et conserve les données brutes permettant de les vérifier.

---

## 3. Étape 1 — Difficulté relative du travail par équipe

Évalue la difficulté du périmètre attribué à chaque équipe, indépendamment de ce qu'elle a effectivement réalisé.

Il faut distinguer la difficulté prévue de la qualité d'exécution.

Pour chaque équipe, examine notamment :

- **Complexité fonctionnelle** : nombre de comportements distincts, richesse des interactions, diversité des cas d'utilisation.
- **Complexité algorithmique** : difficulté des algorithmes, contraintes de performance et cas limites.
- **Complexité architecturale** : nombre de composants, dépendances, interfaces et responsabilités à coordonner.
- **Complexité technique** : bibliothèques, outils, API, formats de données, environnements ou technologies à maîtriser.
- **Complexité d'intégration** : dépendances vis-à-vis d'autres équipes, contrats d'interface, compatibilité et risques de régression.
- **Complexité de validation** : difficulté à tester, démontrer et vérifier le bon fonctionnement.
- **Incertitude et conception** : part du travail nécessitant de prendre des décisions techniques, de comparer des solutions ou de lever des ambiguïtés.

Pour chaque critère, fournis :
1. une appréciation sur une échelle de 1 à 5 ;
2. une justification concrète ;
3. les éléments du README, des spécifications ou du code qui la motivent ;
4. un niveau de confiance.

Échelle indicative :
- 1 : très faible ;
- 2 : faible ;
- 3 : intermédiaire ;
- 4 : élevée ;
- 5 : très élevée.

Présente un tableau comparatif des équipes.

Si tu calcules un score synthétique de difficulté, définis explicitement les pondérations utilisées. Explique pourquoi elles sont pertinentes et indique les limites de ce score.

**Ne déduis jamais qu'une équipe a eu un travail difficile simplement parce qu'elle a peu avancé, ni qu'une équipe a eu un travail facile parce qu'elle a produit beaucoup de code.**

Le résultat de cette étape servira de contexte pour les étapes suivantes, pas de note automatique.

---

## 4. Étape 2 — Difficulté des éléments à réaliser dans chaque équipe

Décompose le périmètre de chaque équipe en éléments fonctionnels ou techniques suffisamment précis pour être évalués séparément.

Un élément peut être une fonctionnalité, un module, une intégration, une infrastructure, un mécanisme de test ou un travail de conception.

Ne te limite pas aux issues effectivement créées : compare les réalisations observées au périmètre annoncé dans le README. Cela permet notamment d'identifier les fonctionnalités attendues qui n'ont jamais été transformées en tâches.

Pour chaque élément, construis une fiche contenant :

- identifiant stable et nom ;
- description et résultat attendu ;
- origine de l'exigence : README, spécification, issue ou autre source ;
- difficulté estimée sur 1 à 5 ;
- justification de la difficulté ;
- dépendances avec les autres éléments ;
- critères d'acceptation observables ;
- état actuel ;
- éléments de preuve disponibles.

Utilise les états suivants, lorsque pertinents :
- non identifié ou non planifié ;
- planifié ;
- en cours ;
- implémenté mais non validé ;
- implémenté et validé ;
- partiellement implémenté ;
- abandonné ou bloqué ;
- impossible à déterminer.

Une issue fermée ou une PR fusionnée ne suffit pas à établir qu'une fonctionnalité est complète. Vérifie le code correspondant, les tests et les critères d'acceptation lorsqu'ils existent.

### Identifier les mockups et les implémentations incomplètes

Dans le périmètre de chaque équipe, recherche explicitement :
- les fonctions vides ou réduites à des valeurs constantes ;
- les retours codés en dur ;
- les données factices utilisées à la place de données réelles ;
- les appels API simulés ou remplacés par des stubs ;
- les interfaces graphiques non reliées à la logique métier ;
- les TODO, FIXME et implémentations provisoires ;
- les chemins de code jamais intégrés ou non accessibles depuis l'application ;
- les tests qui ne vérifient que des cas artificiels ;
- les fonctionnalités présentes dans la documentation mais absentes du code opérationnel.

Ne considère pas automatiquement toute donnée de démonstration comme un défaut : un mock peut être intentionnel et utile pour tester une interface. Détermine s'il remplace une fonctionnalité attendue ou s'il fait partie de l'architecture de test prévue.

Pour chaque élément incomplet, précise :
- ce qui existe ;
- ce qui manque ;
- pourquoi cela empêche de considérer la fonctionnalité comme terminée ;
- les preuves dans le code ;
- la difficulté estimée du travail restant.

Fournis une matrice synthétique des éléments attendus, de leur difficulté et de leur état réel.

---

## 5. Étape 3 — Avancement et organisation du travail par équipe

Évalue séparément l'avancement technique et la qualité de l'organisation collective.

### 5.1. Avancement technique

Pour chaque équipe, estime :
- la part du périmètre attendu effectivement implémentée ;
- la part réellement validée ;
- les éléments partiellement réalisés ;
- les éléments non commencés ;
- les dépendances bloquantes ;
- le travail restant et les risques d'intégration.

Si tu calcules un pourcentage d'avancement, définis son dénominateur. Utilise une estimation fondée sur les éléments attendus, leur importance et leur état réel, plutôt que sur le nombre d'issues fermées ou de lignes de code.

Une fonctionnalité difficile peut peser davantage qu'une tâche cosmétique. Évite toutefois de multiplier les pondérations au point de rendre le résultat impossible à comprendre.

Présente séparément :
- avancement implémenté ;
- avancement validé ;
- avancement organisationnel observable.

Ces dimensions ne sont pas interchangeables.

### 5.2. Qualité de la décomposition du travail

Analyse si l'équipe a su :
- identifier les fonctionnalités nécessaires ;
- transformer les objectifs en tâches cohérentes ;
- créer des issues suffisamment précises ;
- définir des critères d'acceptation ;
- identifier les dépendances ;
- répartir les tâches entre les membres ;
- suivre leur état dans le kanban ;
- fermer les tâches uniquement lorsque les résultats sont effectivement obtenus ;
- adapter son plan en fonction des difficultés rencontrées.

Évalue la pertinence de la décomposition, et non simplement le nombre d'issues créées.

Une issue utile correspond à un travail identifiable, avec un objectif clair, un résultat attendu et des critères de réalisation. Une multitude d'issues artificielles ou redondantes ne constitue pas un indicateur positif.

À l'inverse, une issue très large regroupant tout un projet peut traduire une décomposition insuffisante.

### 5.3. Discussions et coordination

Examine les discussions GitHub et les échanges accessibles pour déterminer si l'équipe a :
- proposé des idées ;
- comparé des solutions ;
- explicité des choix techniques ;
- identifié des risques ;
- demandé ou fourni de l'aide ;
- coordonné les interfaces entre modules ;
- réparti les responsabilités ;
- pris en compte les retours des autres membres.

Ne confonds pas quantité de messages et qualité de la réflexion. Quelques échanges techniques bien argumentés peuvent être plus utiles que de nombreux messages superficiels.

Distingue les décisions effectivement prises des simples propositions.

### 5.4. Qualité du processus de développement

Analyse notamment :
- l'utilisation pertinente des branches ;
- la cohérence des commits ;
- la pertinence et la taille des PR ;
- la qualité des descriptions de PR ;
- le lien entre issues, branches, commits et PR ;
- les revues de code et les corrections qui en découlent ;
- l'intégration régulière avec `main` ;
- les tests et la gestion des régressions ;
- la traçabilité des décisions et du travail.

Un processus parfaitement formalisé n'est pas une fin en soi : il doit contribuer à rendre le développement plus compréhensible, coordonné et fiable.

### 5.5. Diagnostic collectif

Pour chaque équipe, rédige :
- les réussites principales ;
- les difficultés rencontrées ;
- les lacunes de planification ;
- les fonctionnalités qui restent incomplètes ;
- les problèmes de coordination ou d'intégration ;
- les actions prioritaires nécessaires pour terminer le périmètre.

Si les traces ne permettent pas de distinguer un manque de travail d'un problème d'accès, d'une tâche externe ou d'une difficulté technique non documentée, indique cette incertitude au lieu d'attribuer une intention aux étudiants.

---

## 6. Étape 4 — Évaluation individuelle détaillée et quantifiée

Cette étape est centrale.

Pour chaque étudiant identifié dans le README, reconstruis aussi précisément que possible sa contribution effective au projet.

Il ne suffit pas de compter ses commits, ses lignes de code, ses issues ou ses PR. Il faut comprendre ce que l'étudiant a effectivement apporté au résultat collectif.

### 6.1. Contributions à examiner

Pour chaque étudiant, recherche les contributions dans les catégories suivantes.

**A. Conception et planification**
- identification de besoins ;
- propositions de fonctionnalités ;
- création d'issues pertinentes ;
- clarification des exigences ;
- décomposition de tâches complexes ;
- définition de critères d'acceptation ;
- analyse de dépendances et de risques.

**B. Développement**
- fonctionnalités implémentées ;
- algorithmes et logique métier ;
- architecture et interfaces ;
- intégration de composants ;
- correction de bugs ;
- robustesse et gestion des cas limites ;
- refactorisation justifiée.

**C. Validation et qualité**
- tests pertinents ;
- reproduction et diagnostic de bugs ;
- corrections après revue ;
- validation de critères d'acceptation ;
- intégration continue ;
- documentation technique utile.

**D. Coordination et contribution collective**
- discussions techniques substantielles ;
- réponses et aide apportées aux autres ;
- revues de code pertinentes ;
- résolution de conflits d'intégration ;
- amélioration de la répartition du travail ;
- facilitation de décisions collectives.

**E. Résultats effectivement livrés**
- changements présents dans `main` ;
- changements fusionnés mais encore incomplets ;
- PR ouvertes ou abandonnées ;
- code fonctionnel et testé ;
- code provisoire ou mockup ;
- travail commencé mais non intégré.

### 6.2. Reconstruction de la contribution réelle

Pour chaque contribution significative, cherche à établir la chaîne de traçabilité :

`Besoin → Issue → Discussion/décision → Branche/commits → PR → Revue/tests → Résultat intégré`

Cette chaîne n'a pas besoin d'être entièrement matérialisée dans GitHub pour qu'un travail ait de la valeur. Cependant, les liens explicites facilitent la vérification et la compréhension du projet.

Analyse notamment les situations suivantes :
- beaucoup de commits qui correspondent à de petites corrections ;
- une PR volumineuse portant une fonctionnalité complexe ;
- une issue bien construite qui a permis à plusieurs personnes de travailler efficacement ;
- une contribution de conception ayant débloqué l'équipe ;
- du code écrit par une personne, puis substantiellement corrigé ou complété par une autre ;
- du travail individuel important qui n'a jamais été fusionné ;
- du code généré par un agent de programmation ;
- des commits réalisés au nom d'un autre compte ou des squash merges qui masquent la répartition réelle.

Ne crédite pas automatiquement l'auteur du commit de l'intégralité de la valeur fonctionnelle du code. Inversement, ne crédite pas intégralement le travail au dernier contributeur simplement parce qu'il a réalisé l'intégration.

Lorsque l'attribution est ambiguë, indique-le explicitement.

### 6.3. Quantification du travail

Construis un système de quantification compréhensible et stable.

Pour chaque étudiant, estime séparément :

1. **Volume d'activité observable** : commits, PR, issues, revues et contributions aux discussions.
2. **Travail de conception et d'organisation** : qualité des tâches définies, pertinence des décisions et utilité de la planification.
3. **Complexité du travail réalisé** : difficulté des fonctionnalités ou problèmes effectivement traités.
4. **Contribution technique effective** : importance et étendue des changements réellement apportés.
5. **Qualité et fiabilité** : tests, robustesse, corrections et conformité aux exigences.
6. **Contribution à l'intégration et au collectif** : aide apportée, coordination, revues et résolution de dépendances.
7. **Résultat livré** : degré d'achèvement, d'intégration et de validation des contributions.

Pour les dimensions évaluatives, utilise si possible une échelle de 1 à 5 avec des définitions explicites. Pour les dimensions quantitatives, fournis les nombres bruts lorsqu'ils sont fiables.

Les échelles doivent distinguer les niveaux de manière observable. Ne donne pas une note élevée simplement parce qu'une contribution est visible ou volumineuse.

Propose un score synthétique sur 100 uniquement si tu peux le justifier par des critères et des pondérations explicites. Sinon, privilégie un tableau de dimensions séparées.

Si tu utilises un score sur 100 :
- documente les dimensions, les pondérations et les règles de calcul ;
- distingue la quantité d'activité de la valeur du travail ;
- évite de compter plusieurs fois le même travail ;
- ne pénalise pas mécaniquement les contributions de conception ou de coordination ;
- ne récompense pas mécaniquement les petites PR nombreuses ;
- traite explicitement le travail non intégré ;
- signale les dimensions pour lesquelles les données sont insuffisantes.

Le score doit rester interprétable : il ne doit pas donner une apparence de précision scientifique à des jugements subjectifs.

### 6.4. Tableau individuel de synthèse

Produis un tableau comportant au minimum les colonnes suivantes :

| Étudiant | Équipe | Issues créées | PR fusionnées | PR non fusionnées | Commits attribuables | Revues substantielles | Conception/planification | Complexité technique | Qualité/validation | Coordination | Résultats livrés | Synthèse |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---|---|

Les nombres bruts doivent être vérifiables. Les appréciations qualitatives doivent être justifiées.

Ajoute ensuite, si les données le permettent, un tableau de synthèse chiffré comportant les scores par dimension, le score global éventuel, le niveau de confiance et les principales preuves.

Complète ces tableaux par une fiche détaillée pour chaque étudiant :
- principales contributions ;
- fonctionnalités ou problèmes traités ;
- issues, PR et commits les plus significatifs ;
- qualité de la conception et de l'organisation ;
- qualité du code et des validations ;
- travail terminé, partiel ou non intégré ;
- contribution au travail collectif ;
- limites d'attribution et incertitudes ;
- justification détaillée de l'évaluation.

### 6.5. Comparaison équitable des étudiants

La comparaison doit tenir compte du contexte de chaque contribution :
- difficulté du périmètre confié ;
- difficulté réelle des tâches ;
- importance pour le projet ;
- degré d'autonomie observable, sans confondre autonomie et absence de coordination ;
- qualité des résultats ;
- contraintes et dépendances ;
- travail de conception et d'intégration.

Ne compare pas directement le nombre de commits de deux étudiants sans examiner ce qu'ils représentent.

Un étudiant qui a réalisé une fonctionnalité difficile et validée peut avoir apporté davantage qu'un étudiant ayant réalisé de nombreuses petites modifications. De même, un étudiant ayant identifié les bonnes tâches et organisé efficacement le travail peut avoir contribué de manière importante même avec peu de code.

Toutefois, ne suppose pas que les contributions organisationnelles sont toujours plus importantes que les contributions techniques : évalue leur utilité effective dans le contexte du projet.

---

## 7. Méthode de notation et contrôle de cohérence

Avant de finaliser les évaluations, vérifie la cohérence des conclusions.

### 7.1. Ne pas confondre les dimensions

Conserve distinctes :
- la difficulté du travail assigné ;
- le travail réellement effectué ;
- la qualité de ce travail ;
- le degré d'achèvement ;
- la qualité de la coordination ;
- la quantité de traces GitHub.

Une équipe peut avoir un périmètre difficile et un avancement faible. Un étudiant peut avoir une activité importante mais des résultats peu aboutis. Un autre peut avoir peu de commits mais une contribution déterminante.

Ces situations doivent pouvoir être représentées sans contradiction artificielle.

### 7.2. Éviter le double comptage

Une même fonctionnalité ne doit pas être comptée plusieurs fois parce qu'elle apparaît dans une issue, cinq commits, une PR et trois commentaires.

Ces traces constituent des preuves complémentaires d'un travail, et non cinq contributions indépendantes.

Distingue la contribution initiale, les améliorations, les corrections et l'intégration lorsqu'elles correspondent à des apports réels différents.

### 7.3. Vérifier les cas ambigus

Recherche notamment :
- les issues attribuées à un étudiant mais réalisées par un autre ;
- les PR ouvertes par un étudiant qui contiennent surtout du code écrit par un autre ;
- les commits fusionnés par squash ;
- les contributions partagées ;
- les changements générés automatiquement ;
- les PR fusionnées dont la fonctionnalité n'est pas opérationnelle ;
- les issues fermées sans réalisation identifiable ;
- les tâches importantes absentes du kanban ;
- les fonctionnalités présentes dans `main` mais non reliées à une issue.

### 7.4. Confiance des évaluations

Pour chaque appréciation importante, indique un niveau de confiance :
- **élevé** : plusieurs preuves concordantes et traçables ;
- **moyen** : preuves partielles mais suffisantes pour une appréciation prudente ;
- **faible** : traces insuffisantes, attribution incertaine ou critères ambigus.

Une faible traçabilité ne prouve pas l'absence de travail. Elle limite ce qu'il est possible de conclure.

Ne transforme pas une incertitude en pénalité automatique. Signale-la pour permettre une vérification humaine.

### 7.5. Neutralité et prudence

Ne formule pas de jugement sur la motivation, l'implication personnelle ou les intentions d'un étudiant si les traces ne permettent pas de l'établir.

N'infère pas qu'un étudiant n'a pas travaillé simplement parce qu'il a peu de commits visibles. Son travail peut se trouver dans des discussions, des revues, des contributions collectives ou des commits attribués à un autre compte.

N'attribue pas non plus à un étudiant des résultats collectifs sans preuve suffisante de sa contribution.

L'objectif est de produire une base d'évaluation solide pour l'enseignant, pas de remplacer son jugement pédagogique.

---

## 8. Livrable 1 — Rapport global

Produis un rapport structuré en français comprenant :

1. **Résumé exécutif** : état général du projet, principaux résultats et risques.
2. **Périmètre et méthode** : équipes, période, sources et limites des données.
3. **Comparaison des difficultés** : tableau des équipes et justification.
4. **Comparaison de l'avancement** : fonctionnalités réalisées, validées et restantes.
5. **Qualité de l'organisation collective** : issues, discussions, kanban, PR et intégration.
6. **Qualité technique globale** : tests, robustesse, mockups et dette technique.
7. **Comparaison des contributions individuelles** : tableau de synthèse.
8. **Points d'attention pour l'évaluation** : cas ambigus, attributions incertaines et vérifications nécessaires.
9. **Conclusion** : constats principaux et éléments qui méritent une appréciation humaine.

Le rapport doit permettre de comprendre rapidement les différences entre les équipes sans masquer les détails nécessaires à la vérification.

## 9. Livrable 2 — Rapport par équipe

Pour chaque équipe, produis une section indépendante contenant :

1. composition et périmètre assigné ;
2. difficulté du périmètre ;
3. décomposition des fonctionnalités et tâches attendues ;
4. tableau de l'état de chaque élément, de sa difficulté et des preuves ;
5. fonctionnalités terminées, partielles, non commencées ou bloquées ;
6. analyse des mockups et du code provisoire ;
7. qualité de la planification et des issues ;
8. qualité des discussions et des décisions techniques ;
9. qualité du kanban, des branches, des PR et des intégrations ;
10. contribution de chaque membre ;
11. tableau de synthèse collectif ;
12. travail restant et recommandations.

Pour les contributions individuelles, relie les observations aux éléments précis du périmètre de l'équipe.

## 10. Livrable 3 — Rapport par étudiant

Produis une fiche indépendante pour chaque étudiant, contenant :

1. identité GitHub retenue et niveau de certitude ;
2. équipe et périmètre associé ;
3. statistiques d'activité brutes ;
4. liste des contributions significatives, avec liens vers les preuves ;
5. analyse de la conception, de la planification et des issues ;
6. analyse technique du code et des fonctionnalités ;
7. analyse des tests, des revues et de l'intégration ;
8. état réel des résultats produits ;
9. contribution à la coordination collective ;
10. appréciation quantifiée par dimension ;
11. synthèse argumentée et niveau de confiance ;
12. limites et points nécessitant une vérification par l'enseignant.

Chaque fiche doit permettre à l'enseignant de répondre à la question : **qu'a effectivement apporté cet étudiant au projet, quelle était la difficulté de son travail, quelle est la qualité de ses résultats et quelles preuves permettent de l'établir ?**

---

## 11. Format, traçabilité et références

Rédige les rapports en Markdown, avec des tableaux lisibles et des liens directs vers les ressources GitHub pertinentes.

Pour chaque conclusion importante, fournis des références précises : issues, PR, commits, fichiers, lignes de code, discussions ou tests.

Quand c'est possible, cite les lignes exactes du code plutôt que de renvoyer simplement vers la page d'un fichier.

Pour les éléments issus de l'historique, précise la date ou la plage de dates pertinente.

Les tableaux doivent être cohérents entre les trois rapports : les scores, les statistiques et les conclusions ne doivent pas varier d'un livrable à l'autre sans explication.

Ajoute une section « Méthodologie et limites » qui documente :
- les sources exploitées ;
- les règles d'attribution ;
- les critères et pondérations ;
- les limites de l'API ou de l'historique GitHub ;
- les incertitudes et les hypothèses ;
- les éléments qui nécessitent une vérification humaine.

---

## 12. Ordre d'exécution et règles de travail

Procède dans cet ordre :

1. Découvrir le dépôt et identifier les équipes.
2. Collecter les données GitHub pertinentes.
3. Établir le périmètre et la difficulté de chaque équipe.
4. Décomposer les fonctionnalités attendues.
5. Inspecter le code et évaluer l'avancement réel.
6. Analyser le fonctionnement collectif.
7. Reconstruire les contributions individuelles.
8. Quantifier les contributions et vérifier les cas ambigus.
9. Contrôler la cohérence des tableaux et des scores.
10. Produire les trois rapports.

Ne commence pas par établir un classement des étudiants à partir des statistiques GitHub.

Si des données manquent, indique ce qui manque et poursuis l'analyse avec les éléments disponibles. Ne fabrique aucune preuve, aucune statistique ni aucune correspondance d'identité.

Si tu disposes uniquement d'un accès en lecture, reste en lecture seule : ne modifie pas les issues, le kanban, les branches, les PR ou les fichiers du projet.

**Résultat attendu :** trois rapports cohérents, détaillés, quantifiés et vérifiables, permettant à l'enseignant d'évaluer équitablement les équipes et les étudiants, tout en conservant la maîtrise de la décision pédagogique finale.
