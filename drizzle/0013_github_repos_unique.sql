ALTER TABLE "github_repos" ADD CONSTRAINT "github_repos_owner_repo_unique" UNIQUE ("owner", "repo");
