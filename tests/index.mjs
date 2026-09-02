// Point d'entrée unique de la suite de tests.
//
// `node --test tests/*.test.mjs` fonctionne sous Linux et macOS, mais pas sous
// Windows : c'est le shell qui développe l'étoile, et cmd.exe ne le fait pas.
// La commande arrivait donc telle quelle à Node, qui cherchait un fichier
// nommé littéralement « *.test.mjs ». C'est ce qui faisait échouer le job EXE.
//
// En important les fichiers ici, on ne passe qu'un seul chemin à Node : les
// tests s'enregistrent à l'import et tournent partout de la même façon.
import './save.test.mjs';
import './pet.test.mjs';
import './memory.test.mjs';
import './games.test.mjs';
import './profiles.test.mjs';
import './food.test.mjs';
import './species.test.mjs';
import './hearing.test.mjs';
import './agenda.test.mjs';
import './plugin.test.mjs';
