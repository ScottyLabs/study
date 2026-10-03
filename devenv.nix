{ pkgs, inputs, ... }:

{
  imports = [ inputs.scottylabs.devenvModules.default ];

  # semgrep 1.172.0 pins pyjwt~=2.13 but nixpkgs ships 2.14
  overlays = [
    (_final: prev: {
      semgrep = prev.semgrep.overridePythonAttrs (_: {
        dontCheckRuntimeDeps = true;
      });
    })
  ];

  scottylabs = {
    enable = true;
    project.name = "study";

    postgres.enable = true;
    secrets.enable = true;
    ricochet = {
      enable = true;
      appUrl = "http://localhost:3000";
    };

    kennel.services.study.customDomain = "cmustudy.com";
  };

  languages.javascript = {
    enable = true;
    package = pkgs.nodejs_22;
    npm.enable = true;
  };

  scripts = {
    migration.exec = "npx prisma migrate dev";
    migrate.exec = "npx prisma migrate deploy";
    studio.exec = "npx prisma studio";
  };
}
