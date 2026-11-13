# Gry biurowe (offline)

Graj online: https://pozdrawiamwszystkichpolakow.github.io/gry-biurowe/ (GitHub Pages)

Zestaw lekkich gier przeglądarkowych działających bez internetu i bez zewnętrznych zależności (jeden plik HTML + moduły JS). Zaprojektowane do grania w pracy, gdzie strony z grami są blokowane.

## Uruchomienie

Otwórz `index.html` w przeglądarce (dwuklik) albo uruchom lokalny serwer:

```bash
cd /Users/mcpotter/dev/work-games
python3 -m http.server 8765
# http://127.0.0.1:8765
```

Wszystko działa offline. Tryb "szef" (Esc) przełącza na fałszywy arkusz Excela.

## Dodawanie nowej gry

1. Utwórz plik `games/<nazwa>.js`, który definiuje globalny obiekt:

```js
window.NazwaGame = {
  name: 'Nazwa gry',
  desc: 'Krótki opis.',
  init: function(container){ /* zbuduj UI w container */ }
};
```

2. Dodaj `<script src="games/<nazwa>.js"></script>` w `index.html`.

3. Dodaj wpis do tablicy `GAMES` w `index.html`:

```js
(typeof NazwaGame !== 'undefined') ? NazwaGame : null
```

## Dostępne gry

- **Szachy** — hot-seat, gra z komputerem (minimax), multiplayer online P2P (WebRTC, bez serwera, sygnalizacja przez kopiuj/wklej), multiplayer przez serwer (relay.py).
- **Imperia (4X turowa)** — strategia 2-4 graczy na mapie (miasta, armie, ekonomia, badania). Ruchy przesyłane kodem stanu (Teams/mail) — bez serwera i bez sieci.

## Multiplayer przez serwer (LAN/internet)

1. Na jednym komputerze uruchom serwer przekaźnikowy:

```bash
cd /Users/mcpotter/dev/work-games
python3 relay.py 8766
```

2. Sprawdź adres IP tego komputera (np. `192.168.1.10`).
3. Obaj gracze otwierają grę → tryb "Multiplayer przez serwer", wpisują adres `http://192.168.1.10:8766` i ten sam kod pokoju, klikają "Połącz".
4. Pierwszy dołączony gracz gra białymi, drugi czarnymi. Ruchy synchronizują się automatycznie (odpytywanie co ~0.7s).

Serwer działa też przez internet, jeśli port 8766 jest przekierowany/osiągalny. W przeciwnym razie użyj trybu "Multiplayer online (P2P)" (sygnalizacja przez kopiuj/wklej) albo hot-seat.

## Multiplayer online (P2P, bez serwera)

Host klika "Utwórz grę", kopiuje ofertę i wysyła przeciwnikowi (chat, mail). Gość wkleja ofertę, klika "Utwórz odpowiedź", kopiuje odpowiedź i odsyła. Host wkleja odpowiedź i klika "Połącz". Po połączeniu ruchy synchronizują się przez kanał danych WebRTC.

## Struktura

```
index.html          # hub + ładowanie modułów
games/chess.js      # szachy
README.md
```
