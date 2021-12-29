import React from 'react';
import Banner from './Banner';
import Featured from './Featured';
import './Browse.scss';

const Browse = () => {
  return (
    <div className='Browse animated fadeIn'>
      <Banner />
      <Featured />
    </div>
  );
};

export default Browse;
