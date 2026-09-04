#!/usr/bin/env python3
"""Ajuste le manifeste Android engendré par Capacitor.

    python3 tools/patch_manifest.py android/app/src/main/AndroidManifest.xml

Le projet Android est régénéré à chaque compilation : ces réglages ne peuvent
pas y être écrits une fois pour toutes. Le script est idempotent — le relancer
ne change rien.

Deux ajustements :

**Orientation.** `sensorLandscape` n'est plus qu'un **défaut de démarrage** :
depuis que l'utilisateur peut choisir son orientation, c'est la préférence
enregistrée qui décide, appliquée dès le premier écran. Le manifeste garantit
seulement que le jeu s'ouvre dans une orientation utilisable si rien n'a encore
été choisi, et que la fenêtre ne pivote pas pendant le chargement.

**Visibilité du service vocal.** Depuis Android 11, une application ne « voit »
pas les services des autres sans les déclarer. Sans cette déclaration,
`SpeechRecognizer.isRecognitionAvailable()` répond non — et le micro paraît
absent alors que le téléphone sait parfaitement reconnaître la parole.
"""
import sys

QUERIES = """    <queries>
        <intent>
            <action android:name="android.speech.RecognitionService" />
        </intent>
    </queries>
"""

INTENT = """        <intent>
            <action android:name="android.speech.RecognitionService" />
        </intent>
"""


def patch(chemin):
    with open(chemin, encoding="utf-8") as f:
        source = f.read()

    faits = []

    if "screenOrientation" not in source:
        # Capacitor déclare toujours l'activité ainsi : on s'accroche à ce
        # marqueur plutôt qu'au nom du paquet, qui peut changer.
        marqueur = 'android:name=".MainActivity"'
        if marqueur in source:
            source = source.replace(
                marqueur,
                marqueur + '\n            android:screenOrientation="sensorLandscape"',
                1,
            )
            faits.append("orientation paysage")
        else:
            print("::warning::MainActivity introuvable : orientation non appliquée")
    else:
        faits.append("orientation déjà présente")

    if "RecognitionService" not in source:
        if "<queries>" in source:
            source = source.replace("<queries>", "<queries>\n" + INTENT.rstrip("\n"), 1)
        else:
            source = source.replace("</manifest>", QUERIES + "</manifest>")
        faits.append("visibilité du service vocal")
    else:
        faits.append("visibilité déjà présente")

    with open(chemin, "w", encoding="utf-8") as f:
        f.write(source)

    print("Manifeste ajusté :", ", ".join(faits))
    return source


if __name__ == "__main__":
    patch(sys.argv[1])
