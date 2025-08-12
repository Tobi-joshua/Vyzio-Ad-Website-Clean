import { Outlet, useNavigate, useLocation,matchPath } from 'react-router-dom';
import { Box, Toolbar,IconButton } from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';


export default function BannerImage() {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;

  const images = {
    '/categories': 'https://ik.imagekit.io/ooiob6xdv/20250808_1539_Colorful%20Category%20Icons_simple_compose_01k25xak7efsvsr3app9wvmen3.png?updatedAt=1754693062169',
    '/buyer-dashboard':'https://ik.imagekit.io/ooiob6xdv/20250811_0500_Ad%20Dashboard%20Overview_simple_compose_01k2cfy7sse6g8dva051ewf8ty.png?updatedAt=1754913843785'
  
  };

  // Function to match static or dynamic routes
  const getImageForPath = (path) => {
    for (const [pattern, imageUrl] of Object.entries(images)) {
      if (matchPath({ path: pattern, end: true }, path)) {
        return imageUrl;
      }
    }
    return null;
  };

  const currentImage = getImageForPath(path);

  if (!currentImage) return null;

  const showBackArrow = path !== '/';

  return (
    <Box
      sx={{
        width: '100%',
        height: 210,
        overflow: 'hidden',
        mt: -9,
        mb: 0,
        position: 'relative',
        zIndex: 1,
      }}
    >
      <img
        src={currentImage}
        alt="Banner"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />

      {showBackArrow && (
        <IconButton
          onClick={() => navigate(-1)}
          sx={{
            position: 'absolute',
            top: '50%',
            left: 16,
            transform: 'translateY(-50%)',
            backgroundColor: 'rgba(255, 255, 255, 0.7)',
            color: 'black',
            borderRadius: '50%',
            p: 1,
            zIndex: 2,
            mt: { xs: -3, sm: -3 },
            '&:hover': {
              backgroundColor: 'white',
            },
          }}
        >
          <ArrowBackIosNewIcon sx={{ fontSize: 28 }} />
        </IconButton>
      )}
    </Box>
  );
}