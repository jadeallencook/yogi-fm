import React, { useState, useEffect } from 'react';
import { useAllPrismicDocumentsByType } from '@prismicio/react';
import './App.scss';
import sortSpeakers from './utils/sortSpeakers';
import AppContext from './context/AppContext';

import Sidebar from './components/Sidebar';
// import Browse from './components/Browse';
import Player from './components/Player';
// import Songs from './components/Songs';

const App = () => {
  let [speakers] = useAllPrismicDocumentsByType('speaker');
  speakers = sortSpeakers(speakers);
  const [speaker, setSpeaker] = useState('YcQIHxAAACAAVZeR');
  const [lecture, setLecture] = useState(undefined);

  useEffect(
    () => {
      if (speakers) {
        setLecture(speakers[speaker].videos[0]);
      }
    },
    [speakers]
  );

  return speakers && lecture ? (
    <AppContext.Provider
      value={{ speakers, speaker, setSpeaker, lecture, setLecture }}
    >
      <div className='App'>
        <Sidebar />
        <div />
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
