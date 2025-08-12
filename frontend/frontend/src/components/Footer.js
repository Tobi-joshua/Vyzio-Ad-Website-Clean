import React from 'react';

const Footer = () => (
    <footer style={{ background: '#222', color: '#fff', padding: '1.5rem 0', textAlign: 'center' }}>
        <div>
            <p>&copy; {new Date().getFullYear()} Vyzio Ad. All rights reserved.</p>
        </div>
    </footer>
);

export default Footer;