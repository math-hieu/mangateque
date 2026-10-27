# Recommandations de séries

## Résumé

Une page `/recommandations` qui affiche 10 séries à acheter et lire ensuite, choisies à partir des notes (1 à 5) que j'ai mises à mes séries. Pour chaque série : couverture et infos AniList, pourquoi elle me correspond, et un résumé des avis trouvés en ligne (points forts / points faibles, avec sources).

La génération n'est **pas** faite par le site : c'est un skill Claude Code (`/reco`) que je lance à la main en local, avec mon abonnement Claude Pro. Il écrit un fichier JSON daté dans le dépôt ; je commite, Vercel redéploie, la page affiche le dernier fichier.

## Pourquoi

Aujourd'hui, pour choisir ma prochaine série, je lis des blogs ou je demande à Gemini une synthèse positif/négatif des avis. Ce sont ces avis qui m'orientent. Je veux la même chose, mais nourrie par mes propres notes.

Je suis le seul utilisateur : payer l'API Anthropic pour un usage ponctuel n'a pas de sens alors que j'ai déjà un abonnement Pro. Celui-ci ne donne pas accès à l'API, mais Claude Code en local l'utilise. D'où le choix d'une génération manuelle, en local, dont le résultat est commité.

Un essai jetable (27/10/2026) a validé l'intérêt : 5 recos pertinentes, avis sourcés, ~75 s de génération. Le rendu de cet essai, `reco-2026-10-27.html` à la racine (non commité), sert de référence visuelle pour le contenu d'une carte.

## Objectifs

- 10 recommandations par génération, classées par pertinence (#1 = la plus sûre pour moi).
- Pour chacune : titre FR, infos AniList fiables (bonne œuvre !), raison personnalisée citant mes notes, avis positifs et négatifs résumés, liens sources.
- Toutes les générations sont conservées et consultables sur le site.
- Un badge « Dans ma bibliothèque » sur une reco dont la série a depuis été ajoutée à ma mangathèque.
- Zéro coût d'API.

## Non-objectifs

- Pas de génération depuis le site (pas de bouton, pas d'appel LLM côté serveur, pas de clé API).
- Pas de stockage des recos dans Supabase.
- Pas d'action depuis une reco (pas de « ajouter à ma bibliothèque », pas de « pas intéressé »). Le badge est la seule interaction avec la bibliothèque.
- Pas de dédoublonnage entre générations : un titre peut revenir d'une fois sur l'autre, c'est voulu.

## Anti-objectifs

- Recommander une série que je possède déjà.
- Afficher la couverture ou les infos d'une autre œuvre que celle recommandée (bug de l'essai : « Monster » a matché un manhua chinois via la recherche AniList par titre).
- Des avis inventés : chaque point fort/faible doit venir d'une source réellement consultée.

## 1. Le skill `/reco`

Emplacement : `.claude/skills/reco/SKILL.md` dans le dépôt (skill de projet, commité).

Déroulé :

1. **Récupérer le contexte** via un script du dépôt (ex. `scripts/reco-context.mjs`, lancé avec `node --env-file=.env`) qui lit Supabase (schéma `mangateque`) et sort en JSON :
   - les séries notées : titre, note, `anilist_id`, tomes possédés / lus, total, statut, format ;
   - la liste de toutes les séries possédées (titre + `anilist_id`), à exclure.
2. **Choisir 10 séries** non possédées, en s'appuyant sur les notes hautes *et* basses (l'essai a bien exploité les 2/5 pour écarter les shōnen de combat). Uniquement du manga japonais (pas de manhwa/webtoon/manhua — ma bibliothèque n'en contient pas).
   - **Suites, spin-offs, préquelles** d'une série que je possède : autorisés, mais en tenant compte de la note de l'œuvre liée. Note haute (4–5) → bon candidat. Note basse (1–2) → exclu, sauf si les avis le donnent vraiment comme meilleur que l'original (et le « pourquoi » doit alors le dire explicitement). Ex. : j'ai mis 2/5 à Jujutsu Kaisen, je n'ai a priori pas envie de continuer cet univers. Une série possédée non notée ne pèse ni pour ni contre.
3. **Vérifier l'édition française** : chaque série doit être éditée en France, confirmé par une source (site de l'éditeur, Manga-News, Fnac…). Relever l'éditeur VF, le nombre de tomes parus en VF et le statut VF (en cours / terminé). Une série sans édition française confirmée est écartée et remplacée.
4. **Rechercher les avis** sur le web pour chacune (sites FR en priorité : Manga-News, SensCritique, Fnac L'Éclaireur… ; anglophones acceptés), résumer 3–4 points forts et 3–4 points faibles, garder les URL consultées.
5. **Identifier la fiche AniList** de chaque série et la **vérifier** (auteur, année, manga japonais — `countryOfOrigin: JP`) avant de l'accepter — ne jamais prendre aveuglément le premier résultat de recherche. Récupérer : id, URL, titre romaji, couverture (taille `large`), nombre de tomes VO, statut VO, score moyen, genres, année de début, auteurs. Une série sans fiche AniList vérifiable est écartée et remplacée : le fichier contient **toujours exactement 10 recos, toutes avec `anilist` et `fr` renseignés**.
   - Le nombre de tomes VO peut être `null` sur AniList pour une série en cours (c'est le cas de Frieren) : le skill peut le compléter depuis une source web s'il le trouve, sinon il reste `null`.
6. **Écrire** `data/recommandations/YYYY-MM-DD.json` (date du jour) au format ci-dessous.
7. **Ne pas commiter** : je relis et je commite moi-même.

Si un fichier existe déjà à la date du jour, il est écrasé (une génération par jour suffit).

## 2. Format du fichier

`data/recommandations/YYYY-MM-DD.json` :

```json
{
  "generated_at": "2026-10-27T14:32:00+01:00",
  "based_on": { "rated_count": 19, "owned_count": 35 },
  "recommendations": [
    {
      "rank": 1,
      "title": "Frieren",
      "why": "Tu as mis 5/5 à …",
      "pros": ["…"],
      "cons": ["…"],
      "sources": [{ "label": "Manga-News", "url": "https://…" }],
      "related_to": null,
      "fr": {
        "publisher": "Ki-oon",
        "volumes": 13,
        "status": "ongoing",
        "source_url": "https://…"
      },
      "anilist": {
        "id": 118586,
        "url": "https://anilist.co/manga/118586",
        "title_romaji": "Sousou no Frieren",
        "cover_url": "https://s4.anilist.co/…/large/…jpg",
        "volumes": null,
        "status": "ongoing",
        "average_score": 87,
        "genres": ["Adventure", "Drama", "Fantasy"],
        "start_year": 2020,
        "authors": ["Kanehito Yamada", "Tsukasa Abe"]
      }
    }
  ]
}
```

- `status` (VO comme VF) reprend la convention du projet (`"ongoing" | "completed"`, cf. `src/lib/anilist.ts`).
- `fr` et `anilist` sont toujours présents. `anilist.volumes` (VO) peut être `null`.
- `related_to` : `null`, ou le titre de la série de ma bibliothèque dont cette reco est une suite / un spin-off (ex. `"Chainsaw man"`), pour l'afficher sur la carte.
- Un type TypeScript correspondant est ajouté à `src/lib/types.ts`.

## 3. La page `/recommandations`

- Route `src/app/recommandations/page.tsx`, server component, dans le style existant (tokens `surface`, `cream`, `border`… comme les autres pages).
- Lien « Recos » dans `NAV_LINKS` de `src/components/Topbar.tsx`.
- Affiche par défaut le fichier le plus récent. `?date=YYYY-MM-DD` affiche une génération précédente ; un sélecteur en haut liste toutes les dates disponibles (plus récente en premier).
- En tête : date de génération, « basé sur N séries notées ».
- Une carte par reco, dans l'ordre du rang : couverture, rang, titre + badge éventuel, mention « Suite / spin-off de X » si `related_to`, ligne d'infos (éditeur VF, **tomes VF** et statut VF, **tomes VO** et statut VO — « ? » si inconnu —, auteurs, année, score AniList, lien AniList), genres, « pourquoi », points forts / faibles côte à côte (empilés sur mobile), sources en petit.
- Couvertures via `next/image` (le domaine `s4.anilist.co` est déjà autorisé dans `next.config.ts`).
- État vide (aucun fichier) : message expliquant de lancer `/reco`.

### Badge « Dans ma bibliothèque »

Calculé à l'affichage (page dynamique, lecture Supabase) : une reco porte le badge si une série de ma bibliothèque a le même `anilist_id`. Repli si la série possédée n'a pas d'`anilist_id` : comparaison du titre normalisé (casse, accents, ponctuation). Physique ou numérique, peu importe.

## Contraintes

- Next.js 16 (voir `AGENTS.md`) : lire `node_modules/next/dist/docs/` avant d'écrire du code.
- Les JSON sont lus depuis le système de fichiers au runtime sur Vercel : ils doivent être inclus dans la sortie (ex. `outputFileTracingIncludes` dans `next.config.ts` pour la route `/recommandations`), ou bien importés autrement de façon à être embarqués. À vérifier avec un build de prod.
- Le skill tourne uniquement en local (Claude Code + `.env` Supabase).

## Laissé au builder

- Le découpage exact en composants et le design précis de la carte et du sélecteur de date (le rendu de l'essai est une bonne base).
- L'implémentation du script de contexte, et l'éventuel script de validation du JSON appelé par le skill avant d'écrire (recommandé).
- La façon de lister/lire les fichiers côté Next (fs + tracing, ou autre).

## Choix faits par Claude (à vérifier)

- Nom du skill `/reco`, dossier `data/recommandations/`, nom de fichier par date seule (écrasement si relancé le même jour).
- Libellé « Recos » dans la barre de navigation.
- Repli sur le titre normalisé pour le badge.
- Sources FR en priorité pour les avis.
- Série sans fiche AniList vérifiable ou sans édition FR confirmée → écartée et remplacée (toujours 10 recos complètes).
- Manga japonais uniquement.
- Champ `related_to` et mention « Suite / spin-off de X » sur la carte.
