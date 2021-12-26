import React, { useContext } from 'react';
import './Banner.scss';
import AppContext from '../context/AppContext';

const Banner = () => {
  const { speaker, speakers } = useContext(AppContext);
  return (
    <div className='Banner'>
      You're listening to
      <h2 className='animated flipInX' style={{ animationDelay: '100ms' }}>
        {speakers[speaker].name[0].text}
      </h2>
      <p className='animated fadeIn'>
        "{speakers[speaker].quotes[0].quote[0].text}"
      </p>
    </div>
  );
};

export default Banner;
