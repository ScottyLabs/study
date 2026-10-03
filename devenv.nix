{ pkgs, inputs, ... }:

{
  imports = [ inputs.scottylabs.devenvModules.default ];

  scottylabs = {
    enable = true;
    project.name = "study";

    postgres.enable = true;
    secrets.enable = true;
    ricochet = {
      enable = true;
      appUrl = "http://localhost:3000";
    };

    kennel.services.study = { };
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
