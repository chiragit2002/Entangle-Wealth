{pkgs}: {
  deps = [
    pkgs.libdrm
    pkgs.expat
    pkgs.cairo
    pkgs.pango
    pkgs.cups
    pkgs.at-spi2-atk
    pkgs.atk
    pkgs.alsa-lib
    pkgs.xorg.libXi
    pkgs.xorg.libXcursor
    pkgs.xorg.libxcb
    pkgs.xorg.libXrandr
    pkgs.xorg.libXfixes
    pkgs.xorg.libXext
    pkgs.xorg.libXdamage
    pkgs.xorg.libXcomposite
    pkgs.xorg.libX11
    pkgs.nss
    pkgs.chromium
    pkgs.glib
    pkgs.noto-fonts-color-emoji
    pkgs.noto-fonts
  ];
}
