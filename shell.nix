{ pkgs ? import (builtins.fetchGit {
    url = "https://github.com/NixOS/nixpkgs";
    rev = "01b6809f7f9d1183a2b3e081f0a1e6f8f415cb09";
  }) { } }:

let
  prismaEngineCommit = "34ace0eb2704183d2c05b60b52fba5c43c13f303";
  prismaEngineBaseUrl = "https://binaries.prisma.sh/all_commits/${prismaEngineCommit}/debian-openssl-3.0.x";

  fetchPrismaEngine = name: hash:
    pkgs.fetchurl {
      url = "${prismaEngineBaseUrl}/${name}.gz";
      inherit hash;
    };

  prismaEngines = pkgs.stdenv.mkDerivation {
    pname = "studystarter-prisma-engines";
    version = prismaEngineCommit;
    dontUnpack = true;

    nativeBuildInputs = [
      pkgs.autoPatchelfHook
      pkgs.gzip
    ];

    buildInputs = [
      pkgs.openssl
      pkgs.stdenv.cc.cc.lib
      pkgs.zlib
    ];

    installPhase = ''
      mkdir -p $out/bin $out/lib
      gunzip -c ${fetchPrismaEngine "prisma-fmt" "sha256-dqKh4BRuOjPk8oHn3pKwP63zSs4I10SYIu1/raC8y5g="} > $out/bin/prisma-fmt
      gunzip -c ${fetchPrismaEngine "query-engine" "sha256-PBuVZ6Cw7rIwB89RMC6iY3ZyBuo/BcQgM2wsX5ggzWg="} > $out/bin/query-engine
      gunzip -c ${fetchPrismaEngine "libquery_engine.so.node" "sha256-d+XWz9BbDSz/ZbycF64bA+bvm5pnaF7l5le/KTfRwUQ="} > $out/lib/libquery_engine.node
      gunzip -c ${fetchPrismaEngine "schema-engine" "sha256-coTYlofR4KTlbrygv9/NNUlnDp3tuCBUXb66LPAcKF8="} > $out/bin/schema-engine
      chmod +x $out/bin/*
    '';
  };
in
pkgs.mkShell {
  packages = [ pkgs.postgresql ];

  shellHook = ''
    export STUDYSTARTER_PRISMA_ENGINE_COMMIT="${prismaEngineCommit}"
    export PRISMA_FMT_BINARY="${prismaEngines}/bin/prisma-fmt"
    export PRISMA_QUERY_ENGINE_BINARY="${prismaEngines}/bin/query-engine"
    export PRISMA_QUERY_ENGINE_LIBRARY="${prismaEngines}/lib/libquery_engine.node"
    export PRISMA_SCHEMA_ENGINE_BINARY="${prismaEngines}/bin/schema-engine"
  '';
}
