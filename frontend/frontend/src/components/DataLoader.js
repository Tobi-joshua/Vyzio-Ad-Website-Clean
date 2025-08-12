import React from "react";
import ContentLoader from "react-content-loader";
import { useTheme, useMediaQuery } from "@mui/material";

const DataLoader = ({ visible }) => {
  const theme = useTheme();

  // Use media queries for breakpoints
  const isXs = useMediaQuery(theme.breakpoints.only("xs"));
  const isSm = useMediaQuery(theme.breakpoints.only("sm"));
  const isMd = useMediaQuery(theme.breakpoints.only("md"));
  const isLg = useMediaQuery(theme.breakpoints.only("lg"));
  const isXl = useMediaQuery(theme.breakpoints.only("xl"));

  if (!visible) return null;
  let loaderSize;

  if (isXs) loaderSize = 200;
  else if (isSm) loaderSize = 300;
  else if (isMd) loaderSize = 400;
  else if (isLg) loaderSize = 500;
  else if (isXl) loaderSize = 600;
  else loaderSize = 400; // fallback

  const circleRadius = loaderSize * 0.225;
  const logoSize = loaderSize * 0.4;
  const logoRadius = logoSize / 2;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 9999,
      }}
    >
      <div
        style={{
          position: "relative",
          width: loaderSize,
          height: loaderSize,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
        }}
      >
        <ContentLoader
          height={loaderSize}
          width={loaderSize}
          viewBox={`0 0 ${loaderSize} ${loaderSize}`}
          backgroundColor="#d9d9d9"
          foregroundColor="#007bff"
          speed={2}
        >
          <circle cx={loaderSize / 2} cy={loaderSize / 2} r={circleRadius} />
        </ContentLoader>

        <img
          src="https://ik.imagekit.io/ooiob6xdv/20250808_1023_Vyzio%20Ads%20Logo_simple_compose_01k25bb2xcecfsfnz6zpdg4n0m.png?updatedAt=1754674047122"
          alt="Expert Hive Logo"
          style={{
            position: "absolute",
            width: logoSize,
            height: logoSize,
            borderRadius: logoRadius,
            objectFit: "cover",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />
      </div>
    </div>
  );
};

export default DataLoader;
