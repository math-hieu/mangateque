---
name: reco
description: Génère 10 recommandations de séries manga à partir des notes de la mangathèque et les écrit dans data/recommandations/. À lancer à la main, en local, à la racine du dépôt.
---

# /reco — recommandations de séries

Tu joues le rôle d'un libraire spécialisé manga. Tu produis **exactement 10 recommandations** de séries à acheter et lire ensuite, à partir des notes (1 à 5) que l'utilisateur a mises à ses séries. Le résultat est un fichier JSON daté que la page `/recommandations` du site affiche. Référence : `docs/superpowers/specs/2026-10-27-recommandations-design.md`.

Tout ce que tu écris dans le fichier (pourquoi, avis) est en **français**, et s'adresse à l'utilisateur en le tutoyant.

## 1. Récupérer le contexte

```bash
node --env-file=.env scripts/reco-context.mjs
```

Sortie : `rated` (séries notées : titre, note, `anilist_id`, tomes possédés/lus, total, statut, format) et `owned` (toutes les séries possédées : titre + `anilist_id`).

## 2. Choisir les candidats

- Appuie-toi sur les notes **hautes et basses** : ce qu'il a adoré (4–5) indique ce qu'il cherche, ce qu'il a mal noté (1–2) indique ce qu'il faut éviter (genre, ton, structure). Les notes 3 sont neutres.
- **Manga japonais uniquement** : pas de manhwa, webtoon ni manhua.
- **Jamais une série possédée** : exclue par `anilist_id` *et* par titre (comparaison insensible à la casse, aux accents et à la ponctuation ; pense aussi aux titres VO/VF différents).
- **Suites, spin-offs, préquelles** d'une série possédée :
  - l'œuvre liée est notée 4–5 → bon candidat ;
  - notée 1–2 → exclu, **sauf** si les avis le donnent nettement meilleur que l'original ; dans ce cas `why` doit le dire explicitement ;
  - non notée → ni pour ni contre.
  - Dans tous les cas, renseigne `related_to` avec le titre de la série possédée (tel qu'il apparaît dans `owned`), sinon `null`.
- Prépare plus de 10 candidats : certains seront écartés aux étapes 3 et 5.

## 3. Vérifier l'édition française

Pour chaque candidat, confirme par une source web (site de l'éditeur, Manga-News, Fnac…) qu'il est **édité en France**. Relève :

- l'éditeur VF (`fr.publisher`) ;
- le nombre de tomes parus en VF (`fr.volumes`, entier ≥ 1) ;
- le statut VF (`fr.status` : `"ongoing"` ou `"completed"`) ;
- l'URL de la page qui le confirme (`fr.source_url`).

Pas d'édition française confirmée → candidat **écarté et remplacé**.

## 4. Rechercher les avis

Pour chaque candidat, cherche sur le web des avis de critiques et de lecteurs : sources **françaises d'abord** (Manga-News, SensCritique, L'Éclaireur Fnac, blogs…), anglophones acceptées.

- Résume **3 à 4 points forts** (`pros`) et **3 à 4 points faibles** (`cons`).
- **N'invente rien** : chaque point doit venir d'une page que tu as réellement consultée, et cette page figure dans `sources` (`{ "label": "Manga-News", "url": "https://…" }`).
- `why` : 2 à 4 phrases qui expliquent pourquoi cette série lui correspond, en citant ses notes (« Tu as mis 5/5 à … »).

## 5. Identifier et vérifier la fiche AniList

Requête GraphQL (POST `https://graphql.anilist.co`, `Content-Type: application/json`) :

```graphql
query ($s: String) {
  Page(perPage: 10) {
    media(search: $s, type: MANGA, countryOfOrigin: JP) {
      id siteUrl title { romaji english native } coverImage { large }
      volumes status averageScore genres startDate { year }
      staff(perPage: 4) { edges { role node { name { full } } } }
    }
  }
}
```

- Cherche avec le titre romaji ou japonais, puis le titre anglais si besoin.
- **Ne prends jamais aveuglément le premier résultat** : vérifie l'auteur et l'année de début avant d'accepter. (Piège connu : « Monster » remonte un manhua chinois avant l'œuvre d'Urasawa.)
- Conversion du statut : `RELEASING` ou `HIATUS` → `"ongoing"`, tout le reste → `"completed"`.
- `authors` : les membres du staff dont le rôle contient « Story » ou « Art » (sans doublon).
- `volumes` (VO) peut être `null` pour une série en cours ; complète-le depuis une source web fiable si tu le trouves, sinon laisse `null`.
- Pas de fiche AniList vérifiable → candidat **écarté et remplacé**.

## 6. Écrire le fichier

Chemin : `data/recommandations/<date du jour au format YYYY-MM-DD>.json` (s'il existe déjà, écrase-le). Classe les recos par pertinence : `rank` 1 = la plus sûre pour lui.

```json
{
  "generated_at": "2026-10-27T14:32:00+01:00",
  "based_on": { "rated_count": 19, "owned_count": 35 },
  "recommendations": [
    {
      "rank": 1,
      "title": "Titre français",
      "why": "…",
      "pros": ["…"],
      "cons": ["…"],
      "sources": [{ "label": "Manga-News", "url": "https://…" }],
      "related_to": null,
      "fr": { "publisher": "Ki-oon", "volumes": 13, "status": "ongoing", "source_url": "https://…" },
      "anilist": {
        "id": 118586,
        "url": "https://anilist.co/manga/118586",
        "title_romaji": "Sousou no Frieren",
        "cover_url": "https://s4.anilist.co/…",
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

`based_on` reprend le nombre d'éléments de `rated` et de `owned`. Il faut **exactement 10 recos**, toutes avec `fr` et `anilist` renseignés.

## 7. Valider

```bash
node scripts/reco-validate.mjs data/recommandations/<date>.json
```

Tant que la sortie n'est pas `OK`, corrige le fichier et relance.

## 8. Terminer

Affiche la liste des 10 titres (rang, titre, éditeur VF) et le chemin du fichier. **Ne commite pas** : l'utilisateur relit et commite lui-même.
