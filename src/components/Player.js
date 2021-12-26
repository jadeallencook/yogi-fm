import React, { useContext } from 'react';
import './Player.scss';
import AppContext from '../context/AppContext';

const Player = () => {
  const { lecture } = useContext(AppContext);
  const lectureId = lecture.link.embed_url.split('=')[1];

  return (
    <div className='Player animated slideInRight'>
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
    </div>
  );
};

export default Player;
