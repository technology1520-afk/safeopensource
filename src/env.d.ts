/// <reference path="../.astro/types.d.ts" />

declare namespace App {
  interface Locals {
    auth?: import('./lib/admin/auth').AuthContext;
  }
}
