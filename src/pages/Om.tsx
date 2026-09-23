export function Om() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Om prototypen</h1>
          <p className="subtitle">Kartbasert system for søknad om kabeloppheng i stolper — demonstrasjon av hele prosessen mellom søker, netteier/saksbehandler og utførende entreprenør.</p>
        </div>
      </div>

      <div className="grid-2">
        <div className="card card-pad">
          <h3>Hvordan teste flyten</h3>
          <ol style={{ paddingLeft: 18, lineHeight: 1.7 }}>
            <li>Bruk <strong>brukervelgeren</strong> øverst til høyre for å bytte mellom virksomheter og roller (søker, saksbehandler/netteier, entreprenør).</li>
            <li>Som <strong>søker</strong> (Telenor Nett AS): se søknad <strong>KO-2026-0001</strong> — der er stolpe 3 avslått og strekkene rundt merket «krever ny trasévurdering».</li>
            <li>Bytt til <strong>saksbehandler</strong> (Per Solheim, Nettpartner AS): se hvordan tiltak vurderes, prises og kalkyle sendes, og hvordan trasévarselet håndteres.</li>
            <li>Se søknad <strong>KO-2026-0002</strong> for et eksempel der en stolpe er meldt ferdig av entreprenør og godkjent av saksbehandler.</li>
            <li>Bytt til <strong>entreprenør</strong> (Jonas Berg, Linjebygg Entreprenør AS) og se <strong>Arbeidsliste</strong> for tildelte tiltak på tvers av flere stolpeeiere.</li>
            <li>Prøv å opprette en <strong>ny søknad</strong> som søker, eller legg til/fjern en stolpe i <strong>Stolpepark</strong> som saksbehandler.</li>
          </ol>
        </div>
        <div className="card card-pad">
          <h3>Testdata</h3>
          <ul style={{ paddingLeft: 18, lineHeight: 1.8 }}>
            <li><strong>50 fiktive stolper</strong> langs en trasé, fordelt på to stolpeeiere (stolpe 1–25 Nettpartner AS, 26–50 Fjellkraft Nett AS). Stolpeparken er redigerbar.</li>
            <li><strong>3 søkervirksomheter</strong>: Telenor Nett AS, Altibox Fiber AS, Canal Digital Kabel AS.</li>
            <li><strong>2 stolpeeiere/netteiere</strong>: Nettpartner AS, Fjellkraft Nett AS.</li>
            <li><strong>2 entreprenører</strong>: Linjebygg Entreprenør AS, Stolpeservice Nord AS — begge har oppdrag fra flere stolpeeiere.</li>
            <li><strong>4 søknader</strong> i ulike faser, inkludert én som fortsatt er et utkast.</li>
          </ul>
          <hr className="sep" />
          <p className="faint">Alle priser, navn og data er fiktive og kun til demonstrasjonsformål. Bruk «Nullstill demo» øverst til høyre for å tilbakestille alle endringer.</p>
        </div>
      </div>
    </div>
  );
}
