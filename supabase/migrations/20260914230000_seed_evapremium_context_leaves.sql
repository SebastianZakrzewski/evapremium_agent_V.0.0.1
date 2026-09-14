-- Seed approved EvaPremium FAQ leaves (draft v0.2.0).
-- Applied on PROD 2026-09-14. Upserts by slug.
-- Leaves chat-zapis / zgoda-lead left untouched (empty body for business copy).

insert into eva_bot.context_nodes (slug, title, body, sort_order, is_active)
values
  (
    'material-eva',
    'Z czego są dywaniki',
    'Dywaniki EvaPremium są wykonane z pianki EVA (etylen–octan winylu). To elastyczny, wodoodporny materiał, który odzyskuje kształt po nacisku i nie chłonie zabrudzeń jak klasyczna wykładzina.',
    20,
    true
  ),
  (
    'parametry',
    'Parametry techniczne',
    'Dywaniki mają grubość ok. 10 mm i gęstość ok. 0,6 g/cm³. Pianka EVA zachowuje elastyczność w mrozie i jest odporna na typowe temperatury w kabinie — zakres pracy to ok. -40°C do +80°C.',
    21,
    true
  ),
  (
    'wlasciwosci',
    'Właściwości użytkowe',
    'Dywaniki EVA są wodoodporne, łatwe w czyszczeniu i chronią oryginalną podłogę przed brudem oraz wilgocią. Materiał jest elastyczny, odporny na zużycie i ma właściwości antypoślizgowe oraz higieniczne.',
    22,
    true
  ),
  (
    'struktura-komorek',
    'Struktura powierzchni',
    'Dywaniki mają głęboką strukturę komórek, która zatrzymuje brud i wilgoć na powierzchni. Do wyboru są dwa wzory: romby oraz plastry miodu.',
    23,
    true
  ),
  (
    '3d-z-rantami',
    'Dywaniki 3D z rantami',
    'Dywaniki 3D z rantami mają podniesione krawędzie (u nas do ok. 8 cm), które lepiej chronią podłogę przed brudem i wilgocią. Wersja EvaPremium obejmuje też języzor 3D pod pedałami oraz rzepy w rogach dla stabilnego ułożenia.',
    30,
    true
  ),
  (
    '3d-bez-rantow',
    'Dywaniki 3D bez rantów',
    'Oferujemy też dywaniki 3D bez rantów — z niższym profilem przy krawędziach. Jeśli zależy Ci na maksymalnej ochronie boków podłogi, lepszym wyborem będzie wersja z rantami.',
    31,
    true
  ),
  (
    'kolory',
    'Kolorystyka',
    'Dostępna jest szeroka paleta kolorów — od klasycznych (czarny, szarości, beże, brąz, kość słoniowa) po żywsze barwy. Kolor na ekranie może nieznacznie różnić się od rzeczywistego ze względu na ustawienia wyświetlacza i oświetlenie.',
    32,
    true
  ),
  (
    'dopasowanie-model',
    'Dopasowanie do modelu',
    'Dywaniki dopasowujemy do konkretnej marki, modelu i wersji samochodu — nie są uniwersalne „na oko”. Obsługujemy bardzo szeroką bazę modeli; jeśli Twojego auta nie ma na liście, możemy pomóc przez zamówienie indywidualne.',
    40,
    true
  ),
  (
    'czyszczenie',
    'Jak czyścić',
    'Czyszczenie jest proste: wytrząśnij dywanik, opłucz wodą lub przetrzyj wilgotną ściereczką. Przy większych zabrudzeniach użyj delikatnego detergentu. Unikaj agresywnej chemii — materiał EVA jest wodoodporny i szybko schnie.',
    50,
    true
  ),
  (
    'uzytkowanie-zima-lato',
    'Użytkowanie całoroczne',
    'Dywaniki EVA nadają się do użytku całorocznego. Zatrzymują wodę i brud na powierzchni, więc zimą lepiej chronią podłogę przed śniegiem i wilgocią.',
    51,
    true
  ),
  (
    'montaz',
    'Montaż',
    'Montaż jest prosty: wystarczy ułożyć dywaniki w odpowiednich miejscach. Są precyzyjnie wycięte pod podłogę auta; stabilizację zapewniają mocowania i rzepy — bez klejenia.',
    60,
    true
  ),
  (
    'podpietki',
    'Podpiętki',
    'Podpiętki chronią miejsce pod piętą kierowcy przed przetarciem. Nie są w komplecie dywaników — to osobny produkt, który można dokupić przy zamówieniu.',
    61,
    true
  ),
  (
    'czas-produkcji',
    'Czas realizacji',
    'Standardowy czas realizacji to zwykle 2–3 tygodnie, bo każdy komplet powstaje indywidualnie. Dostępna jest też szybsza realizacja ekspresowa za dodatkową opłatą.',
    70,
    true
  ),
  (
    'dostawa',
    'Dostawa',
    'Wysyłamy kurierem na terenie Polski. Po nadaniu przesyłka zwykle dociera w 1–2 dni robocze. Od 600 zł dostawa jest zawsze darmowa; poniżej 600 zł koszt wynosi 27 zł.',
    71,
    true
  ),
  (
    'gwarancja',
    'Gwarancja',
    'Wszystkie dywaniki EvaPremium objęte są 1-roczną gwarancją na wady materiałowe i wykonania. W razie uznanej wady wymieniamy produkt bezpłatnie.',
    80,
    true
  ),
  (
    'niedopasowanie-wymiana',
    'Gwarancja dopasowania',
    'Każdy klient ma gwarancję dopasowania. Jeśli dywaniki nie pasują, zgłoś reklamację w ciągu 14 dni od odbioru — naprawimy komplet albo uszyjemy nowy na nasz koszt, łącznie z dostawą.',
    81,
    true
  ),
  (
    'reklamacja',
    'Reklamacja',
    'W razie problemu zbierzemy opis i zdjęcia. Przy braku dopasowania (zgłoszenie do 14 dni) naprawimy komplet lub uszyjemy nowy na nasz koszt z dostawą. Przy wadzie materiałowej lub wykonania działa 1-roczna gwarancja.',
    82,
    true
  ),
  (
    'kontakt',
    'Kontakt',
    'Możesz zadzwonić pod +48 793 993 430 albo kontynuować rozmowę tutaj — chętnie pomogę w dopasowaniu i wycenie orientacyjnej.',
    90,
    true
  )
on conflict (slug) do update
set
  title = excluded.title,
  body = excluded.body,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;
