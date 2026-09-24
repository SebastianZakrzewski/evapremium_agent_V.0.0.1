-- Focus retrieval_text on each leaf's own questions.
-- Body stays unchanged. Do not apply to PROD without an explicit go-ahead.
-- After apply, re-ingest embeddings: the chunk is this column.

update eva_bot.context_nodes as node
set retrieval_text = focused.text
from (
  values
    (
      'material-eva',
      'z czego wykonane materiał pianka EVA skład chemiczny tworzywo piankowe czy gumowe czy piankowe mata podłogowa'
    ),
    (
      'kolory',
      'paleta kolorów odcienie barwy czarny szary beż czerwony niebieski brąz kość słoniowa wybór koloru obwódki lista barw warianty kolorystyczne'
    ),
    (
      '3d-z-rantami',
      'wariant 3D z rantami rant boczny obwódka wysoki brzeg model z rantami rant dookoła krawędź'
    ),
    (
      '3d-bez-rantow',
      'wariant 3D bez rantów płaski brzeg bez obwódki bez wysokiego brzegu niski profil krawędzi'
    ),
    (
      'montaz',
      'montaż instalacja jak zamontować jak założyć w aucie instrukcja pierwszego zakładania'
    ),
    (
      'wlasciwosci',
      'właściwości parametry odporność na wodę brud sztywność antypoślizgowe cechy pianki'
    ),
    (
      'trwalosc-dywanikow',
      'trwałość żywotność ile lat wytrzymują szybko się niszczą zużycie przy codziennym użytkowaniu wytrzymałe na lata'
    ),
    (
      'uzytkowanie-zima-lato',
      'użytkowanie zima lato mróz upał temperatura sezon całoroczne'
    ),
    (
      'dopasowanie-model',
      'jak dobrać pomóżcie dobrać model marka rok generacja szablon pojazdu wybór samochodu konfigurator czy pasują do każdego auta'
    ),
    (
      'podpietki',
      'podpiętki mocowanie klipsy haczyki trzymanie pod piętą dokupić do zestawu'
    ),
    (
      'dostawa',
      'kiedy wyślecie zamówienie wysyłka kurier paczka nadanie przesyłki tracking dostawa do klienta magazyn wyjazd'
    ),
    (
      'czas-produkcji',
      'ile trwa szycie dni szycia ile czeka na uszycie dni robocze produkcja realizacja na zamówienie termin wykonania'
    ),
    (
      'gwarancja',
      'jak długo jest gwarancja okres gwarancji ile lat rękojmia wady fabryczne warunki gwarancji producenta'
    ),
    (
      'czyszczenie',
      'czyścić prać myć pielęgnacja odkurzanie myjka detergent pralka jak dbać'
    ),
    (
      'reklamacja',
      'jak zgłosić reklamację procedura formularz wada uszkodzenie w transporcie co podać w zgłoszeniu'
    ),
    (
      'niedopasowanie-wymiana',
      'nie pasują co robić zły rozmiar niedopasowanie po dostawie wymiana za duże za małe nie leżą'
    ),
    (
      'kontakt',
      'kontakt telefon mail infolinia godziny otwarcia adres sklepu konsultant'
    )
) as focused(slug, text)
where node.slug = focused.slug;
