output "port" {
  value = docker_container.inventory.ports[0].external
}

output "logs" {
  value = docker_container.inventory.container_logs
}
