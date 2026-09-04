#!/usr/bin/env python3
"""Ajuste le projet Android engendré par Capacitor.

    python3 tools/patch_manifest.py android/app/src/main/AndroidManifest.xml

Le projet Android est régénéré à chaque compilation : ces réglages ne peuvent
pas y être écrits une fois pour toutes. Le script est idempotent — le relancer
ne change rien.

Trois ajustements :

**Orientation de démarrage.** `sensorPortrait`, et non paysage.

Ce n'est pas l'orientation du jeu — celle-là se choisit dans les réglages et
s'applique en JavaScript. C'est celle de la **toute première fenêtre**, avant que
le moindre code ait tourné : l'écran de présentation, puis le choix du profil.
Or ces deux écrans sont des formulaires, affichés en portrait.

Le manifeste annonçait le paysage : le logo apparaissait couché, puis l'écran
pivotait aussitôt pour demander le prénom. Une rotation pour rien, dès la
première seconde. `sensorPortrait` accepte les deux sens du portrait, et laisse
le jeu prendre l'orientation voulue au moment où il commence vraiment.

**Écran de démarrage système.** Depuis Android 12, le système affiche lui-même
un écran d'attente avant que la moindre ligne de code tourne : l'icône de
l'application, dans un cercle, sur le fond défini par le thème. Ce fond est
blanc par défaut — d'où ce petit logo carré sur blanc qui précédait le vrai
écran de présentation. Les attributs correspondants n'existent qu'à partir de
l'API 31, ils vont donc dans un fichier `values-v31/`.

**Visibilité du service vocal.** Depuis Android 11, une application ne « voit »
pas les services des autres sans les déclarer. Sans cette déclaration,
`SpeechRecognizer.isRecognitionAvailable()` répond non — et le micro paraît
absent alors que le téléphone sait parfaitement reconnaître la parole.
"""
import sys

FOND = "#0B0F1E"

# Le thème de lancement de Capacitor. S'il changeait de nom, la surcharge
# resterait sans effet — sans rien casser pour autant.
STYLES_V31 = f"""<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen">
        <item name="android:windowSplashScreenBackground">{FOND}</item>
        <item name="android:windowSplashScreenIconBackgroundColor">{FOND}</item>
        <item name="android:windowBackground">@drawable/splash</item>
        <item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item>
    </style>
</resources>
"""

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


def ecrire_styles(chemin_manifeste):
    """Pose le fond sombre de l'écran de démarrage système (Android 12+)."""
    import pathlib

    res = pathlib.Path(chemin_manifeste).parent / "res" / "values-v31"
    res.mkdir(parents=True, exist_ok=True)
    cible = res / "styles.xml"

    if cible.exists() and FOND in cible.read_text(encoding="utf-8"):
        return "fond de démarrage déjà posé"

    cible.write_text(STYLES_V31, encoding="utf-8")
    return "fond de démarrage système assombri"


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
                marqueur + '\n            android:screenOrientation="sensorPortrait"',
                1,
            )
            faits.append("orientation de démarrage en portrait")
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

    faits.append(ecrire_styles(chemin))

    print("Projet Android ajusté :", ", ".join(faits))
    return source


if __name__ == "__main__":
    patch(sys.argv[1])
