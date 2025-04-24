output "port" {
  value = docker_container.inventory.ports[0].external
}

output "host" {
  value = docker_container.inventory.name
}
