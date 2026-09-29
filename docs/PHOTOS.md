# Photos des plats

Les photos sont dans `public/plats/` (servies par le site), au format WebP
800 × 600 (le format 4:3 des cartes). Chaque plat pointe vers sa photo par
`items.photo_url` (migration).

## Ajouter ou remplacer des photos

1. Mettre les photos dans un dossier, nommées par le nom de fichier voulu
   (ex. `spritz.jpg`).
2. Les convertir :
   ```bash
   npm run photos -- "C:\chemin\vers\le\dossier"
   ```
3. Relier chaque photo à son plat par une migration
   (`update public.items set photo_url = '/plats/…webp' …`).
4. Déployer : migration, puis le site.

**Droits** : uniquement des photos appartenant à J&J, ou sous licence libre
(Unsplash, Pexels…). Jamais d'images prises sur Internet sans licence.

## Crédits

Photos [Unsplash](https://unsplash.com/license) : usage commercial autorisé,
gratuit, sans obligation de citation (crédits conservés ici par précaution).

| Fichier | Plat | Photographe | Source |
|---|---|---|---|
| service-a-table.webp | Service à table | Photos by Lanty | https://unsplash.com/photos/O38Id_cyV4M |
| banquet.webp | Banquet — service au plat | Maddi Bazzocco | https://unsplash.com/photos/-Wi2owaQcH8 |
| buffet.webp | Buffet convivial | Pia Kamp | https://unsplash.com/photos/iacrF-fHr08 |
| punch-mojito.webp | Punch façon mojito | Francesca Hotchin | https://unsplash.com/photos/p5EiqkBYIEE |
| mojito.webp | Mojito « J&J » | Sakshi Ranjan | https://unsplash.com/photos/Vy-_h7EnJZc |
| pimms.webp | Pim's | Aurora Song | https://unsplash.com/photos/lrBk-HHmgcU |
| spritz.webp | Spritz | federica ariemma | https://unsplash.com/photos/cSWRV1EXm5I |
| bellini.webp | Bélini | Anil Sharma | https://unsplash.com/photos/3JYa_RZZQXg |
| soupe-champenoise.webp | Soupe champenoise | Cody Berg | https://unsplash.com/photos/VAhUq30sW0c |
| sans-alcool.webp | Cocktail sans alcool | Rirri | https://unsplash.com/photos/R4zSXgDZLEU |

Ce ne sont pas les plats de J&J : à remplacer par leurs propres photos dès
qu'elles existent.
