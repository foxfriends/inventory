terraform {
  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0.2"
    }
  }
}

locals {
  image         = "${var.image_name}:${var.image_version}"
  internal_port = 3000
}

data "docker_registry_image" "inventory" {
  name = local.image
}

resource "docker_image" "inventory" {
  name          = local.image
  pull_triggers = [data.docker_registry_image.inventory.sha256_digest]
}

resource "docker_network" "inventory" {
  name = "inventory-external"
}

resource "docker_container" "inventory" {
  image   = docker_image.inventory.image_id
  name    = var.name
  restart = var.restart

  memory = 256

  log_driver = var.log_driver
  log_opts   = var.log_opts

  dynamic "ports" {
    for_each = var.expose ? [var.port] : []

    content {
      internal = local.internal_port
      external = ports.value
    }
  }

  volumes {
    container_path = "/config"
    host_path      = var.config_dir
    read_only      = false
  }

  network_mode = "bridge"

  networks_advanced {
    name = docker_network.inventory.id
  }

  dynamic "networks_advanced" {
    for_each = var.networks
    iterator = net

    content {
      name = net.value["name"]
    }
  }

  healthcheck {
    test         = ["CMD", "curl", "-f", "localhost:${local.internal_port}/health"]
    interval     = "5s"
    retries      = 2
    start_period = "1s"
    timeout      = "500ms"
  }

  env = [
    "CONFIG_DIR=/config",
    "RES_DIR=/app/res",
    "PORT=${local.internal_port}",
  ]
}
