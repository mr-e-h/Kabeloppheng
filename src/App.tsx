import { HashRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { SoknaderListe } from './pages/SoknaderListe';
import { NySoknad } from './pages/NySoknad';
import { SoknadDetalj } from './pages/SoknadDetalj';
import { Arbeidsliste } from './pages/Arbeidsliste';
import { Stolpepark } from './pages/Stolpepark';
import { Innstillinger } from './pages/Innstillinger';
import { Om } from './pages/Om';

function SoknadDetaljRoute() {
  const { id } = useParams<{ id: string }>();
  return <SoknadDetalj key={id} />;
}

export default function App() {
  return (
    <HashRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/soknader" element={<SoknaderListe />} />
          <Route path="/soknader/ny" element={<NySoknad />} />
          <Route path="/soknader/:id" element={<SoknadDetaljRoute />} />
          <Route path="/tiltakskatalog" element={<Navigate to="/innstillinger" replace />} />
          <Route path="/arbeidsliste" element={<Arbeidsliste />} />
          <Route path="/stolpepark" element={<Stolpepark />} />
          <Route path="/innstillinger" element={<Innstillinger />} />
          <Route path="/om" element={<Om />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}
