import React, { useContext } from 'react';
import './Songs.scss';
import AppContext from '../context/AppContext';
import { useParams } from 'react-router-dom';

const Songs = () => {
  const {
    speakers,
    setLecture,
    setSpeaker,
    isMobilePlayerOpen,
    setIsMobilePlayerOpen,
  } = useContext(AppContext);
  const { id } = useParams();
  const speaker = speakers[id];

  return (
    <div
      className={`Songs ${
        isMobilePlayerOpen ? 'mobile-player-open' : 'mobile-player-closed'
      }`}
    >
      <div className='music-cover animated fadeInDown'>
        <h2>{speaker.name[0].text}</h2>
      </div>
      <div className='titles animated fadeIn'>
        <div>
          <b>Lecture Title</b>
        </div>
        <div>
          <b>Speaker</b>
        </div>
      </div>
      {speaker.videos.map((video, index) => {
        const { title } = video;
        return !title[0] ? null : (
          <div
            key={`${id}-${index}`}
            className='song animated fadeIn'
            style={{
              animationDelay: `${index * 50}ms`,
            }}
            onClick={() => {
              setLecture(video);
              setSpeaker(id);
              setIsMobilePlayerOpen(true);
            }}
          >
            <div>{title[0].text}</div>
            <div>{speaker.name[0].text}</div>
          </div>
        );
      })}
    </div>
  );
};

export default Songs;
