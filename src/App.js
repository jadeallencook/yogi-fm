import React, { useState, useEffect } from 'react';
import { useAllPrismicDocumentsByType } from '@prismicio/react';
import './App.scss';
import sortSpeakers from './utils/sortSpeakers';
import sortFeatured from './utils/sortFeatured';
import AppContext from './context/AppContext';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

import Sidebar from './components/Sidebar';
import MobileMenu from './components/MobileMenu';
import Browse from './components/Browse';
import Player from './components/Player';
import Songs from './components/Songs';

const App = () => {
  let [speakers] = useAllPrismicDocumentsByType('speaker');
  let [featured] = useAllPrismicDocumentsByType('featured');
  speakers = sortSpeakers(speakers);
  featured = sortFeatured(featured);
  const [speaker, setSpeaker] = useState('YcQIHxAAACAAVZeR');
  const [lecture, setLecture] = useState(undefined);
  const [isMobilePlayerOpen, setIsMobilePlayerOpen] = useState(false);

  const context = {
    speakers,
    speaker,
    setSpeaker,
    lecture,
    setLecture,
    featured,
    isMobilePlayerOpen,
    setIsMobilePlayerOpen,
  };

  useEffect(
    () => {
      if (speakers && !lecture) {
        setLecture(speakers[speaker].videos[0]);
      }
    },
    [speakers]
  );

  return speakers && lecture && featured ? (
    <AppContext.Provider value={context}>
      <div className='App'>
        <BrowserRouter>
          <MobileMenu />
          <Sidebar />
          <Routes>
            <Route path='/' element={<Browse />} />
            <Route path='/speaker/:id' element={<Songs />} />
          </Routes>
          <Player />
        </BrowserRouter>
      </div>
    </AppContext.Provider>
  ) : null;
};

export default App;
