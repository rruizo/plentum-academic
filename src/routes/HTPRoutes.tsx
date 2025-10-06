import { Routes, Route } from 'react-router-dom';
import HTPExam from '@/pages/HTPExam';

const HTPRoutes = () => {
  return (
    <Routes>
      <Route path="/htp-exam/:accessLink" element={<HTPExam />} />
    </Routes>
  );
};

export default HTPRoutes;