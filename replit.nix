
{ pkgs }:

pkgs.mkShell {
  buildInputs = [
    pkgs.libudev
    pkgs.gcc
    pkgs.make
    pkgs.python3
  ];
}
