import React, { useContext } from 'react';
import './MobileMenu.scss';
import { Link } from 'react-router-dom';
import AppContext from '../context/AppContext';

const MobileMenu = () => {
  const { setIsMobilePlayerOpen } = useContext(AppContext);
  return (
    <div className='MobileMenu'>
      <Link to='/' onClick={() => setIsMobilePlayerOpen(false)}>
        &#8962;
      </Link>
    </div>
  );
};

export default MobileMenu;
