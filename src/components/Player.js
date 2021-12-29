import React, { useContext } from 'react';
import './Player.scss';
import AppContext from '../context/AppContext';

const Player = () => {
  const { lecture, speaker: id, speakers, isMobilePlayerOpen } = useContext(
    AppContext
  );
  const lectureId = lecture.link.embed_url.split('=')[1];
  const speaker = speakers[id];

  return (
    <div
      className={`Player animated slideInRight ${
        isMobilePlayerOpen ? 'mobile-player-open' : 'mobile-player-closed'
      }`}
    >
      <div>
        <iframe
          id='speaker-video'
          className='speaker-video'
          src={`https://www.youtube.com/embed/${lectureId}`}
          title='Speaker Video'
          frameBorder='0'
          allowFullScreen={false}
        />
      </div>
      <div className='about'>
        <h3>{speaker.name[0].text}</h3>
        <p>
          {speaker.biography[0]
            ? speaker.biography[0].text
            : 'There is not yet a biography for this speaker.'}
        </p>
      </div>
    </div>
  );
};

export default Player;
