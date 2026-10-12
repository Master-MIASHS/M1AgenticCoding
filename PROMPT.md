# Mission : évaluation du projet de programmation agentique sur GitHub

## 1. Objectif

Analyse le dépôt GitHub du cours de programmation agentique afin de produire trois livrables :

1. **Rapport global** : comparaison des équipes, état du projet et principaux constats.
2. **Rapport par équipe** : difficulté du périmètre, avancement, qualité du travail collectif et tâches restantes.
3. **Rapport par étudiant** : contributions détaillées, quantifiées et comparables.

Le README décrit les étudiants de chaque équipe et le périmètre qui leur est attribué.

Les étudiants sont censés proposer et discuter des idées, créer et s'assigner des issues, organiser le travail avec le kanban, développer dans des branches, soumettre des PR vers `main`, tester et intégrer leurs contributions.

**Principe central : évaluer la valeur réelle du travail réalisé, pas le volume apparent d'activité.** Le nombre de commits, de lignes de code, d'issues ou de PR ne constitue jamais, à lui seul, une mesure pertinente de la contribution.

L'utilisation d'agents de programmation ou de code généré par IA n'est ni un mérite ni un défaut en soi. Ce qui compte est la capacité à produire un résultat pertinent, fiable, compris et correctement intégré au projet collectif.

## 2. Collecte et traçabilité des données

Explore le README, les spécifications, le code, les issues, les discussions, le kanban, les branches, les commits, les PR, les revues de code, les tests et l'intégration continue, dans la mesure où ces informations sont accessibles.

Identifie les membres de chaque équipe et établis prudemment la correspondance entre les étudiants, les comptes GitHub et les auteurs de commits.

Détermine la période d'évaluation si elle est précisée. Distingue le code présent dans `main`, le code des branches et les PR non fusionnées.

Appuie chaque conclusion importante sur des preuves précises : liens vers les issues, PR, commits, discussions, fichiers et lignes de code.

Signale les données manquantes, les attributions incertaines et les limites de l'historique. Ne fabrique aucune information. Travaille en lecture seule.

## 3. Étape 1 — Difficulté relative des équipes

Évalue la difficulté du travail attendu pour chaque équipe, indépendamment de son avancement.

Prends en compte :

- la complexité fonctionnelle et algorithmique ;
- les difficultés architecturales et techniques ;
- les dépendances avec les autres composants ou équipes ;
- les exigences d'intégration, de test et de validation ;
- les incertitudes de conception et les choix techniques nécessaires.

Attribue à chaque critère une appréciation de 1 à 5, justifiée par des éléments concrets. Fournis un tableau comparatif des équipes et explique les éventuelles différences de charge.

Ne déduis jamais la difficulté du travail de la quantité de code produite ou du succès apparent de l'équipe. Si tu calcules un score synthétique, explicite les pondérations et leurs limites.

## 4. Étape 2 — Difficulté et état des éléments attendus

Pour chaque équipe, décompose le périmètre du README en fonctionnalités, composants ou tâches suffisamment précis pour être évalués.

Pour chaque élément, indique :

- sa description et son origine ;
- sa difficulté estimée sur 5 ;
- ses dépendances éventuelles ;
- son état réel : non planifié, planifié, en cours, partiel, implémenté, validé, bloqué ou indéterminé ;
- les preuves et critères permettant de justifier cet état.

Ne te limite pas aux issues existantes : identifie également les besoins attendus qui n'ont jamais été planifiés.

Inspecte le code pour détecter les fonctionnalités incomplètes, les valeurs codées en dur, les mocks, les stubs, les TODO, les interfaces non connectées, les tests insuffisants et les fonctionnalités annoncées mais non opérationnelles.

Un mock n'est pas nécessairement un défaut : vérifie s'il remplace une fonctionnalité attendue ou s'il est volontairement utilisé pour les tests.

Distingue systématiquement ce qui est implémenté de ce qui est réellement testé et opérationnel.

## 5. Étape 3 — Avancement et organisation collective

Pour chaque équipe, évalue séparément :

**Avancement technique**

- fonctionnalités terminées, partielles, non commencées ou bloquées ;
- code opérationnel et code provisoire ;
- intégration réelle dans le projet ;
- tests, régressions et dette technique ;
- travail restant et risques principaux.

Si tu estimes un pourcentage d'avancement, définis sa méthode de calcul en tenant compte de l'importance des fonctionnalités. Ne l'assimile pas au pourcentage d'issues fermées.

**Organisation et coordination**

- pertinence de la décomposition en issues ;
- qualité des objectifs et des critères d'acceptation ;
- utilisation du kanban et répartition des tâches ;
- discussions techniques, propositions et décisions ;
- coordination des interfaces et dépendances ;
- qualité des branches, PR, revues et intégrations ;
- prise en compte des retours et résolution des problèmes.

Évalue la pertinence des échanges, pas leur nombre. Une issue bien conçue ou une discussion qui débloque un problème peut avoir plus de valeur que de nombreuses petites PR.

Identifie les développements parallèles qui ne s'intègrent pas au projet, les doublons, les interfaces incompatibles et les fonctionnalités développées sans coordination suffisante.

Distingue les défauts d'organisation des blocages externes. Ne déduis pas les motivations des étudiants à partir des seules traces disponibles.

## 6. Étape 4 — Contribution individuelle quantifiée

Pour chaque étudiant, reconstruis les contributions observables à partir des issues, discussions, commits, PR, revues, tests et changements réellement livrés.

Analyse notamment :

- la conception et la planification ;
- la pertinence des issues créées ;
- la difficulté des problèmes résolus ;
- le développement et la correction de bugs ;
- la qualité, les tests et la validation ;
- l'intégration architecturale ;
- la coordination et l'aide apportée aux autres ;
- le résultat effectivement livré, y compris le travail non fusionné.

Lorsque c'est possible, retrace la chaîne :

`Besoin → Issue → Discussion/décision → Code → PR → Revue/tests → Résultat intégré`

Cette chaîne n'a pas besoin d'être parfaite pour qu'une contribution soit valable, mais les liens explicites facilitent son attribution.

### Évaluer le travail au-delà du volume de code

Porte une attention particulière aux étudiants qui produisent beaucoup de code, éventuellement avec des agents IA, sans vérifier suffisamment sa pertinence ou son intégration.

Recherche notamment :

- du code sans lien démontré avec les besoins du projet ;
- des fonctionnalités redondantes ou qui réimplémentent l'existant ;
- des composants isolés, des interfaces incompatibles ou des PR jamais intégrées ;
- des mocks présentés comme des fonctionnalités terminées ;
- des tests superficiels ou une absence de validation ;
- des changements qui cassent d'autres fonctionnalités ;
- des développements effectués sans tenir compte des discussions, des issues ou de l'architecture existante.

Distingue une utilisation efficace de l'IA — avec vérification, correction, compréhension et intégration — d'une délégation non maîtrisée dont les résultats ne sont pas validés.

N'infère pas automatiquement l'utilisation de l'IA à partir du style du code. N'affirme pas non plus qu'un étudiant ne comprend pas son code si les traces GitHub ne permettent pas de l'établir. Dans ce cas, signale le point à vérifier par l'enseignant, par exemple lors d'une courte explication orale ou d'une démonstration.

### Quantification

Pour chaque étudiant, fournis :

- les statistiques brutes : issues créées, PR fusionnées et non fusionnées, commits attribuables, revues substantielles et contributions aux discussions ;
- une appréciation de 1 à 5, avec justification, pour chacune des dimensions suivantes :
  1. conception et organisation ;
  2. difficulté du travail effectivement réalisé ;
  3. valeur fonctionnelle livrée ;
  4. qualité technique et validation ;
  5. intégration au projet collectif ;
  6. coordination et contribution aux autres ;
- les principales réalisations, les travaux incomplets et les incertitudes d'attribution.

Ne compte pas plusieurs fois une même contribution parce qu'elle apparaît dans une issue, plusieurs commits et une PR. Distingue les apports réellement différents.

Si tu proposes un score global sur 100, explicite les pondérations, évite le double comptage et justifie pourquoi le score reflète la contribution effective. À défaut d'une méthode défendable, conserve les dimensions séparées plutôt que de produire un score artificiellement précis.

Un étudiant ayant réalisé une fonctionnalité complexe, testée et intégrée peut avoir davantage contribué qu'un étudiant ayant créé de nombreuses PR mineures. Une contribution de conception ou de coordination peut également être importante. En revanche, le code volumineux, non validé ou incompatible avec le projet ne doit pas être assimilé à une quantité équivalente de travail utile.

## 7. Livrables attendus

### A. Rapport global

- résumé de l'état du projet ;
- méthodologie, période et limites des données ;
- comparaison de la difficulté des équipes ;
- comparaison de l'avancement et de l'organisation ;
- tableau de synthèse des contributions individuelles ;
- principaux risques, incertitudes et points à vérifier.

### B. Rapport par équipe

- membres et périmètre attendu ;
- difficulté et décomposition du travail ;
- état de chaque fonctionnalité ;
- analyse des mocks et des implémentations incomplètes ;
- qualité de la planification, des discussions et du kanban ;
- qualité technique et intégration ;
- contribution de chaque membre ;
- travail restant et recommandations.

### C. Rapport par étudiant

- identité et équipe ;
- statistiques d'activité brutes ;
- contributions significatives avec preuves ;
- appréciation quantifiée par dimension ;
- valeur fonctionnelle, qualité, validation et intégration ;
- travaux non terminés ou non intégrés ;
- contribution au collectif ;
- synthèse argumentée et niveau de confiance.

Fournis un tableau comparatif commun aux trois rapports, comportant au minimum : étudiant, équipe, statistiques d'activité, scores par dimension, résultats livrés et niveau de confiance.

## 8. Contrôle final

Avant de conclure :

- vérifie la cohérence entre les trois rapports ;
- contrôle les attributions ambiguës et les contributions partagées ;
- distingue difficulté, activité, qualité, achèvement et intégration ;
- vérifie que les conclusions importantes reposent sur des preuves ;
- explicite les limites des données disponibles.

Ne classe pas les étudiants uniquement par volume d'activité. Ne transforme pas un manque de traçabilité en preuve d'absence de travail. Ne confonds pas non plus quantité de code et maîtrise technique.

Produis trois rapports en français, structurés en Markdown, avec des tableaux lisibles et des liens directs vers les preuves GitHub. L'objectif est de fournir à l'enseignant une base d'évaluation équitable, détaillée, quantifiée et vérifiable, tout en laissant à celui-ci la décision pédagogique finale.
