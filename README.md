# Materials Science Flashcards - GitHub Pages

Static website. No server, database, Node.js, or build step is required.

## Publish

1. Create a new GitHub repository, e.g., `matsci-flashcards`. On GitHub Free, use a public repository for Pages.
2. Upload the CONTENTS of this folder to the repository root, with `index.html` at root (do not upload the ZIP itself).
3. Open repository Settings > Pages > Build and deployment. Select Source: Deploy from a branch; Branch: main; Folder: /(root); click Save.
4. Access https://YOUR-USERNAME.github.io/matsci-flashcards/

## How it works

- 303 cards; original corrected-answer scans on 78 cards.
- Notes and review history are saved to THIS browser's localStorage, not synced between devices.
- To move from local files to GitHub Pages, export a JSON backup first and import it on the Pages site.
- HTTPS enables the service worker to cache site assets as they are viewed.

## Visibility, rights, and privacy

GitHub Pages sites are public, even when the underlying repository is private. Source material and scans may be copyrighted: publish only with appropriate permission. Do not put private notes or credentials in this repository. Study notes stay in each browser (not the repo), but a shared computer can access the local browser's stored notes.

## Full edition

Includes `book.pdf` and `answers-corrected.pdf` to support the original-PDF buttons. Verify you have permission to distribute these files publicly before uploading. If not, use the light edition (the flashcards and excerpt scans may also have rights restrictions).
