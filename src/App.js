import React, { useState, useEffect } from 'react';
import { useAllPrismicDocumentsByType } from '@prismicio/react';
import './App.scss';
import sortSpeakers from './utils/sortSpeakers';
import sortFeatured from './utils/sortFeatured';
import AppContext from './context/AppContext';

import Sidebar from './components/Sidebar';
import Browse from './components/Browse';
import Player from './components/Player';
// import Songs from './components/Songs';

const App = () => {
  let [speakers] = useAllPrismicDocumentsByType('speaker');
  let [featured] = useAllPrismicDocumentsByType('featured');
  speakers = sortSpeakers(speakers);
  featured = sortFeatured(featured);
  const [speaker, setSpeaker] = useState('YcQIHxAAACAAVZeR');
  const [lecture, setLecture] = useState(undefined);

  const context = {
    speakers,
    speaker,
    setSpeaker,
    lecture,
    setLecture,
    featured,
  };

  useEffect(
    () => {
      if (speakers) {
        setLecture(speakers[speaker].videos[0]);
      }
    },
    [speakers]
  );

  return speakers && lecture && featured ? (
    <AppContext.Provider value={context}>
      <div className='App'>
        <Sidebar />
        <Browse />
        <Player />
        {/* {null ? (
        <Songs options={null} play={null} />
      ) : (
        <Browse open={() => null} options={null} />
      )} */}
      </div>
    </AppContext.Provider>
  ) : null;
};

export default App;
