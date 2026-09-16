---
name: frontend-design
description: Guidance pour un design visuel distinctif et intentionnel lors de la création de nouvelles interfaces ou de la refonte d'interfaces existantes — direction esthétique, typographie et choix qui n'ont pas l'air de templates par défaut.
license: Apache-2.0
metadata:
  source: https://github.com/anthropics/skills
  original: "Frontend Design (anthropics/skills, Apache-2.0)"
---

# Design front-end

> Travaux dérivés de « Frontend Design » (anthropics/skills), publiés sous Apache-2.0. Notice de modification requise par la licence : ce fichier a été traduit et adapté au contexte du projet (composants React, interface du casino).

Aborde chaque interface comme le directeur de création d'un studio dont la réputation repose sur le fait que chaque client reçoive une identité visuelle distincte, ne ressemblant à aucune autre. Ce client a déjà rejeté des propositions qui sonnaient cliché ou template : fais des choix délibérés et opinés sur la palette, la typographie et le layout, spécifiques à cette mission, et prends des risques esthétiques si c'est justifié.

## Ancrer le design dans le sujet

Si le cahier des charges ne précise pas le produit ou le sujet, l'identifier avant de concevoir, et le confirmer avec le client. Proposer un sujet concret, l'audience du design et la fonction principale du design. L'industrie, le sujet, les matériaux et le vernaculaire du domaine sont là que naissent les choix visuels distinctifs — un design pour un jouet d'enfants de 8-11 ans sera très différent d'un dashboard pour analystes financiers. Construire avec le contenu réel de la mission du début à la fin.

## Principes de design

- **L'ouverture est la première chose vue.** Commencer par l'élément le plus caractéristique du sujet, sous la forme la plus appropriée : un titre, une image, une animation, une démo live, un moment interactif. Le gros nombre avec petit label, stats d'accompagnement et accent en dégradé est le traitement par défaut : ne l'utiliser que si c'est vraiment le meilleur choix.
- **La typographie porte la personnalité.** Une famille, ou deux nettement distinctes. Choisir des familles avec intention, pas les familles par défaut qu'on attraperait sur n'importe quel autre projet. Échelle typographique claire, graisses et espacements délibérés. Quand le texte sert de titre ou d'élément visuel, le traitement typographique est une partie active du design, pas un support neutre.
- **Mesures de ligne** : moins de 80 caractères par défaut ; un peu plus pour les serifs, avec une interligne légèrement plus généreuse sur le corps de texte serif.
- **Éviter les traitements typographiques par défaut** (signes les plus évidents d'une page générée) :
  - Surligner un seul mot ou phrase d'un titre (italique/gras/couleur)
  - Tout en majuscules pour les libellés
  - Libellés typographiques inutiles au-dessus du contenu
- **La structure visuelle est de l'information.** Cadres, bordures, numérotation, séparateurs : encoder une information utile sur le contenu, pas décorer. Les marqueurs numérotés (01 / 02 / 03) n'ont leur place que si le contenu est réellement une séquence (processus en étapes, chronologie).
- **Mouvement non déclenché par l'utilisateur** : rare et délibéré, seulement pour attirer l'attention. Un seul moment orchestré (une séquence au chargement, une révélation) vaut mieux que des effets dispersés ; l'entrée « fondu + glissement haut » sur chaque section et la transition hover sur chaque carte sont le défaut générique. Le mouvement qui répond à l'action d'une personne (ouvrir, déplier, confirmer) est le bienvenu s'il montre ce qui a changé.
- **Le contenu écrit compte.** Quand le cahier des charges n'inclut pas de contenu réel, proposer des textes. Des textes template donnent l'air template au design.

## Processus : planifier, revérifier contre la mission, construire, critiquer

Les designs générés par IA se concentrent aujourd'hui autour de certains traits :
1. fond crème chaud (près de #F4F1EA), serif haute contraste et accent terracotta (près de #D97757)
2. fond quasi noir avec un unique accent vert acide ou vermillon
3. layout « broadsheet » : filets, zéro arrondi, colonnes denses façon journal
4. le kit de cartes SaaS : contenu découpé en cartes arrondies identiques, un seul border-radius partout, la même ombre douce (rgba(0,0,0,.1)), dégradés décoratifs
5. la chrome de template : libellés en majuscules espacées au-dessus de chaque titre, méta-chaînes jointes par points médians (« A · B · C »), libellés « MOT — fragment » avec tiret espacé, quasi-noir teinté (#0B0B0B, #111) en lieu et place du noir, monospace pour les petits libellés de données, « → » ajouté au texte des liens et boutons

Tous ces traits sont légitimes pour certaines missions, mais ce sont des défauts, pas des choix : ils apparaissent quel que soit le sujet. Quand la mission fixe une direction visuelle, la suivre à la lettre — les mots de la mission priment toujours. Quand elle laisse un axe libre, ne pas le dépenser sur l'un de ces défauts.

Travailler en deux passes. D'abord, un court plan de design basé sur la mission : créer un système de tokens compact.
- **Couleur** : la palette de base décrite en 4-6 valeurs hex nommées.
- **Typo** : les familles et leurs rôles.
- **Layout** : un concept de layout, en prose d'une phrase et maquettes ASCII pour explorer et comparer. Inclure l'alignement (gauche, centre, justifié ?)
- **Principes** : les lignes directrices qui rendent cette page unique.

Ensuite, revérifier ce plan contre la mission avant de construire : si une partie ressemble au défaut générique qu'on produirait pour n'importe quelle page similaire plutôt qu'à un choix fait pour cette mission — réviser cette partie, dire ce qui a changé et pourquoi. N'écrire le code qu'après avoir confirmé la singularité relative du plan de design, en suivant le plan révisé.

Quand on écrit le code, attention à la spécificité des sélecteurs CSS : il est facile de générer des classes qui s'annulent mutuellement (notamment entre un sélecteur de type `.section` et un sélecteur d'élément `.cta`), souvent sur le padding/margin entre sections.

## Mesure et autocritique

Dépenser son audacie à un seul endroit. Laisser un élément être le mémorable, garder tout ce qui l'entoure calme et discipliné, couper toute décoration qui ne sert pas la mission. Construire jusqu'à un plancher de qualité sans l'annoncer : responsive jusqu'au mobile, focus clavier visible, mouvement réduit respecté, accessible visuellement, palette harmonieuse. Critiquer son propre travail en construisant, faire des captures d'écran pour revérifier si l'environnement le permet — une image vaut 1000 tokens. Le conseil de Chanel : avant de sortir, se regarder dans le miroir et retirer un accessoire. Noter rapidement ce qui a été essayé pour les passes suivantes.

## L'écriture dans le design

Les mots apparaissent dans un design pour une raison : le rendre plus facile à comprendre et à utiliser. Ils sont du contenu de design, pas de la décoration. Apporter à l'écriture la même intentionnalité et le même minimalisme qu'à l'espacement et à la couleur. Avant d'écrire quoi que ce soit, demander ce que le design doit dire, et comment le dire au mieux pour aider la personne à naviguer.

- **Écrire du point de vue de l'utilisateur final.** Nommer par ce que l'utilisateur comprend en langage simple, pas par la façon dont le système est construit. Un utilisateur gère des notifications, pas une config de webhook. Décrire ce que quelque chose est ou fait, en termes plats, plutôt que de le vendre. Spécifique et lisible pour les nouveaux utilisateurs vaut toujours mieux que malin.
- **Voix active par défaut.** Un CTA dit exactement ce qui se passe quand on l'utilise : « Enregistrer les modifications », pas « Soumettre ». Une action garde le même nom sur tout le flux : le bouton « Publier » produit un toast « Publié ». Le vocabulaire d'une interface est le balisage pour celui qui navigue. Cohérence et constance : c'est ainsi que les gens apprennent leurs repères.
- **Traiter les échecs et le vide comme des moments de direction, pas d'humeur.** Expliquer ce qui a mal tourné et comment le corriger, dans la voix de l'interface plutôt que dans celle d'une personne. Les erreurs ne s'excusent pas et ne sont jamais vagues sur ce qui s'est passé. Un écran vide est une invitation à agir.
- **Ton conversationnel** : verbes plats, sentence case, pas de remplissage, ton adapté à la marque et à l'audience. Chaque élément écrit fait exactement un travail.

## Liens avec les autres skills

- `ingenierie-ui-frontend` : l'architecture des composants (cette skill couvre la qualité visuelle).
- `relecture-et-qualite` : l'axe lisibilité et performance vérifie les interfaces.
- `feat-dev` : les phases de conception et de vérification intègrent cette skill.
