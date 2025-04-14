terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.2"
    }
  }
}

locals {
  image = "${var.image_name}:${var.image_version}"
}

data "docker_registry_image" "inventory" {
  name = local.image
}

resource "docker_image" "inventory" {
  name          = local.image
  pull_triggers = [data.docker_registry_image.inventory.sha256_digest]
}

resource "docker_container" "inventory" {
  image   = docker_image.inventory.image_id
  name    = var.name
  restart = var.restart

  ports {
    internal = 3000
  }

  volumes {
    container_path = "/config"
    host_path      = var.config_dir
    read_only      = false
  }

  network_mode = "bridge"

  healthcheck {
    test         = ["CMD", "curl", "-f", "localhost:3000/health"]
    interval     = "0.5s"
    retries      = 2
    start_period = "1s"
    timeout      = "0.5s"
  }

  env = [
    "CONFIG_DIR=/config",
    "RES_DIR=/app/res",
    "PORT=3000",
  ]
}
