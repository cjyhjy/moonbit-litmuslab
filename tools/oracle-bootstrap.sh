#!/bin/sh
# Install only into this project's .tools/oracle; never changes shell/global config.
set -eu
[ "$(uname -s)" = Darwin ] && [ "$(uname -m)" = arm64 ] || {
  echo 'This bootstrap is pinned to macOS arm64. Other hosts may install herdtools7 7.58 separately.' >&2
  exit 2
}
ROOT=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
BASE="$ROOT/.tools/oracle"
mkdir -p "$BASE/bin" "$ROOT/reports/oracle-raw"
export OPAMROOT="$BASE/opam"
export OPAMYES=1 OPAMJOBS=4 OPAMDOWNLOADJOBS=3
export TMPDIR="$BASE/tmp"
mkdir -p "$TMPDIR"
export PATH="$BASE/prefix/bin:$BASE/bin:$PATH"
export PKG_CONFIG_PATH="$BASE/prefix/lib/pkgconfig"
export C_INCLUDE_PATH="$BASE/prefix/include"
export LIBRARY_PATH="$BASE/prefix/lib"
export DYLD_LIBRARY_PATH="$BASE/prefix/lib"
verify_sha256() {
  printf '%s  %s\n' "$1" "$2" | shasum -a 256 -c -
}
if [ ! -x "$BASE/bin/opam" ]; then
  curl --fail --location --retry 3 --connect-timeout 20 \
    https://github.com/ocaml/opam/releases/download/2.6.1/opam-2.6.1-arm64-macos \
    -o "$BASE/bin/opam"
  verify_sha256 3e7f67bda3ba0bf72f597917b17dc337ed5a1bd48224df8b747bb35ce05c569e "$BASE/bin/opam"
  chmod +x "$BASE/bin/opam"
fi
opam --version
if [ ! -f "$OPAMROOT/config" ]; then
  opam init --bare --no-setup --disable-sandboxing default https://opam.ocaml.org
fi
if ! opam switch list --short | grep -qx litmus-oracle; then
  opam switch create litmus-oracle ocaml-base-compiler.4.14.2 -y
fi
if [ ! -f "$BASE/prefix/lib/libgmp.a" ]; then
  curl -fsSL --retry 3 https://ftp.gnu.org/gnu/gmp/gmp-6.3.0.tar.xz -o "$BASE/gmp-6.3.0.tar.xz"
  verify_sha256 a3c2b80201b89e68616f4ad30bc66aee4927c3ce50e33929ca819d5c43538898 "$BASE/gmp-6.3.0.tar.xz"
  tar -xf "$BASE/gmp-6.3.0.tar.xz" -C "$BASE"
  (cd "$BASE/gmp-6.3.0" && ./configure --prefix="$BASE/prefix" && make -j4 && make install)
fi
if [ ! -x "$BASE/prefix/bin/pkgconf" ]; then
  curl -fsSL --retry 3 https://distfiles.ariadne.space/pkgconf/pkgconf-2.5.1.tar.xz -o "$BASE/pkgconf-2.5.1.tar.xz"
  verify_sha256 cd05c9589b9f86ecf044c10a2269822bc9eb001eced2582cfffd658b0a50c243 "$BASE/pkgconf-2.5.1.tar.xz"
  tar -xf "$BASE/pkgconf-2.5.1.tar.xz" -C "$BASE"
  (cd "$BASE/pkgconf-2.5.1" && ./configure --prefix="$BASE/prefix" && make -j4 && make install)
fi
ln -sf pkgconf "$BASE/prefix/bin/pkg-config"
# External dependencies were built above; do not invoke Homebrew.
opam install --switch=litmus-oracle --assume-depexts \
  dune.3.24.2 menhir.20260209 ocamlfind.1.9.8 zarith.1.14 \
  conf-gmp.5 conf-pkg-config.5 conf-which.1 -y
# Build only the herd7 executable, not the unrelated litmus/diy/asl tools.
if [ ! -f "$BASE/herdtools7-7.58.tar.gz" ]; then
  curl -fsSL --retry 3 https://codeload.github.com/herd/herdtools7/tar.gz/refs/tags/7.58 -o "$BASE/herdtools7-7.58.tar.gz"
fi
verify_sha256 1b72798457e678dec781ce914c4bd84dc6bae3c3c044cf4257d0974bf7f066ad "$BASE/herdtools7-7.58.tar.gz"
if [ ! -d "$BASE/herdtools7-7.58" ]; then
  tar -xf "$BASE/herdtools7-7.58.tar.gz" -C "$BASE"
fi
# The normal version-gen.sh queries git and can pick up a parent repository.
# Generate only this build metadata from the verified release archive identity.
cat > "$BASE/herdtools7-7.58/Version.ml" <<EOF
let version = "7.58"
let rev = "1ca343e16a2038e406d1ac674e7e3a1b722b36c7 (source archive)"
let libdir = "$BASE/prefix/share/herdtools7/"
EOF
(cd "$BASE/herdtools7-7.58" && opam exec --switch=litmus-oracle -- dune build --root . -j 4 --profile release herd/herd.exe)
cp "$BASE/herdtools7-7.58/_build/default/herd/herd.exe" "$BASE/bin/herd7"
mkdir -p "$BASE/prefix/share/herdtools7/herd"
cp -R "$BASE/herdtools7-7.58/herd/libdir/." "$BASE/prefix/share/herdtools7/herd/"
"$BASE/bin/herd7" -version
