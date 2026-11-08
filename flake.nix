{
  description = "CMU Study";

  nixConfig = {
    extra-substituters = [ "https://scottylabs.cachix.org" ];
    extra-trusted-public-keys = [
      "scottylabs.cachix.org-1:hajjEX5SLi/Y7yYloiXTt2IOr3towcTGRhMh1vu6Tjg="
    ];
  };

  inputs = {
    scottylabs.url = "git+https://git.cmu.dev/ScottyLabs/kennel";
    nixpkgs.follows = "scottylabs/nixpkgs";
    flake-parts.follows = "scottylabs/flake-parts";
  };

  outputs =
    inputs:
    let
      # must track @prisma/engines-version in deno.lock
      engineCommit = "34ace0eb2704183d2c05b60b52fba5c43c13f303";

      engineTargets = {
        x86_64-linux = "debian-openssl-3.0.x";
        aarch64-linux = "linux-arm64-openssl-3.0.x";
      };

      engineHashes = {
        "debian-openssl-3.0.x" = {
          "libquery_engine.so.node" = "sha256-d+XWz9BbDSz/ZbycF64bA+bvm5pnaF7l5le/KTfRwUQ=";
          "schema-engine" = "sha256-coTYlofR4KTlbrygv9/NNUlnDp3tuCBUXb66LPAcKF8=";
        };
        "linux-arm64-openssl-3.0.x" = {
          "libquery_engine.so.node" = "sha256-cA/To5do7O6+OuxN1hbpfmJPStD+jV6IiJ3ARjjFjGQ=";
          "schema-engine" = "sha256-q9cVoz1oz7Ket8jdoSgIl8UIjTZXSOJlrJe1LETLEn8=";
        };
      };
    in
    inputs.flake-parts.lib.mkFlake { inherit inputs; } {
      imports = [ inputs.scottylabs.flakeModules.default ];
      # the prisma engines are only fetched for linux
      systems = [
        "x86_64-linux"
        "aarch64-linux"
      ];

      perSystem =
        {
          pkgs,
          lib,
          system,
          helpers,
          ...
        }:
        let
          nodejs = pkgs.nodejs_22;

          engineTarget = engineTargets.${system};

          fetchEngine =
            name:
            pkgs.fetchurl {
              url = "https://binaries.prisma.sh/all_commits/${engineCommit}/${engineTarget}/${name}.gz";
              hash = engineHashes.${engineTarget}.${name};
            };

          # nixpkgs ships prisma-engines 7.x, incompatible with the pinned 5.16 client
          prismaEngines = pkgs.stdenv.mkDerivation {
            pname = "prisma-engines";
            version = engineCommit;

            dontUnpack = true;
            nativeBuildInputs = [ pkgs.autoPatchelfHook ];
            buildInputs = [
              pkgs.openssl
              pkgs.stdenv.cc.cc.lib
            ];

            installPhase = ''
              runHook preInstall

              mkdir -p $out/lib $out/bin
              gzip -dc ${fetchEngine "libquery_engine.so.node"} > $out/lib/libquery_engine.node
              gzip -dc ${fetchEngine "schema-engine"} > $out/bin/schema-engine
              chmod +x $out/bin/schema-engine

              runHook postInstall
            '';
          };

          queryEngineLibrary = "${prismaEngines}/lib/libquery_engine.node";

          start = pkgs.writeShellScript "study-start" ''
            set -eu

            export HOSTNAME=127.0.0.1
            export PRISMA_QUERY_ENGINE_LIBRARY=${queryEngineLibrary}
            export PRISMA_SCHEMA_ENGINE_BINARY=${prismaEngines}/bin/schema-engine

            # kennel's socket url names no role, leaving peer auth to map the
            # unit's DynamicUser; prisma sends an empty user unless the url has one
            case "''${DATABASE_URL:-}" in
              postgresql:///*)
                export DATABASE_URL="postgresql://$(${pkgs.coreutils}/bin/id -un)@localhost/''${DATABASE_URL#postgresql:///}"
                ;;
            esac

            ${lib.getExe nodejs} "$1"/share/migrate/node_modules/prisma/build/index.js \
              migrate deploy --schema "$1"/share/migrate/schema/schema.prisma

            exec ${lib.getExe nodejs} "$1"/share/study/server.js
          '';

          built = helpers.buildDenoTask {
            pname = "study";
            version = "0.1.0";
            output = ".";

            src = lib.fileset.toSource {
              root = ./.;
              fileset = lib.fileset.unions [
                ./deno.json
                ./deno.lock
                ./package.json
                ./next.config.js
                ./postcss.config.cjs
                ./tailwind.config.ts
                ./tsconfig.json
                ./prisma
                ./public
                ./src
              ];
            };
          };

          study = built.overrideAttrs (old: {
            nativeBuildInputs = old.nativeBuildInputs ++ [ pkgs.makeWrapper ];
            buildInputs = old.buildInputs ++ [ pkgs.openssl ];

            env = {
              PRISMA_QUERY_ENGINE_LIBRARY = queryEngineLibrary;
              PRISMA_SCHEMA_ENGINE_BINARY = "${prismaEngines}/bin/schema-engine";

              # next build won't work without dummy env variables, unable to find way to fix this....
              SERVER_URL = "http://localhost:3000";
              BETTER_AUTH_URL = "http://localhost:3000";
              OAUTH_RELAY_URL = "http://localhost:3000/api/auth/callback";
              KEYCLOAK_URL = "http://localhost:8080";
              KEYCLOAK_REALM = "build";
              OIDC_CLIENT_ID = "build";
              OIDC_CLIENT_SECRET = "build";
              PROJECT_ADMIN_GROUP = "build";
              ALLOWED_ORIGINS_REGEX = "^$";
              DATABASE_URL = "postgresql://localhost:5432/build";
              BETTER_AUTH_SECRET = "build";

              # We need to find a general way to handle these kind of env vars, prolly hide them behind the backend
              NEXT_PUBLIC_POSTHOG_KEY = "phc_IJNs9U2sDlLIoQgfTC5sq2sCSXL4HB0Er9AmGG0Aoqi"; # gitleaks:allow
              NEXT_PUBLIC_POSTHOG_HOST = "https://us.i.posthog.com";
              NEXT_PUBLIC_CALENDAR_CLIENT_ID = "588552119886-3ro6nh2vgjslui03i19lfo9i6dj8mv2n.apps.googleusercontent.com";

              NEXT_TELEMETRY_DISABLED = "1";
            };

            installPhase = ''
              runHook preInstall

              mkdir -p $out/share/study $out/share/migrate/node_modules
              cp -r .next/standalone/. $out/share/study/
              cp -r .next/static $out/share/study/.next/static
              cp -r public $out/share/study/public

              # the standalone trace copies addons patched against the build tree
              chmod -R u+w $out/share/study
              find $out/share/study/node_modules -name '*musl*' -prune -exec rm -rf {} +
              autoPatchelf $out/share/study/node_modules

              cp -r prisma $out/share/migrate/schema
              cp -rL node_modules/prisma $out/share/migrate/node_modules/prisma
              cp -rL node_modules/.deno/node_modules/@prisma $out/share/migrate/node_modules/@prisma

              makeWrapper ${start} $out/bin/study --add-flags $out

              runHook postInstall
            '';

            meta = {
              description = "Find and manage CMU study groups";
              mainProgram = "study";
              platforms = lib.platforms.linux;
            };
          });
        in
        {
          scottylabs = {
            project.name = "study";

            postgres.enable = true;
            ricochet = {
              enable = true;
              appUrl = "http://localhost:3000";
            };

            deno = {
              enable = true;
              react.enable = true;
            };

            processes.web = {
              run = "exec secretspec run -P dev -- deno task dev";
              depends = [ "postgres-setup" ];
            };

            shell = {
              env = {
                PRISMA_QUERY_ENGINE_LIBRARY = queryEngineLibrary;
                PRISMA_SCHEMA_ENGINE_BINARY = "${prismaEngines}/bin/schema-engine";
              };

              # prisma sends an empty user unless the url names one
              exports = lib.mkAfter ''
                case "$DATABASE_URL" in
                  postgresql:///*)
                    export DATABASE_URL="postgresql://$(id -un)@localhost/''${DATABASE_URL#postgresql:///}"
                    ;;
                esac
              '';

              scripts = {
                migration = "deno task db:generate";
                migrate = "deno task db:migrate";
                studio = "deno task db:studio";
              };
            };
          };

          packages.prisma-engines = prismaEngines;

          pre-commit.settings.hooks = {
            deno-test.enable = lib.mkForce false;
            vitest = {
              enable = true;
              name = "vitest";
              entry = "deno task test:all";
              files = "\\.(ts|tsx|mts|cts|js|mjs|cjs|jsx|prisma)$";
              pass_filenames = false;
              language = "system";
            };
          };

          services.web = {
            package = study;
            customDomain = "cmustudy.com";
          };
        };
    };
}
