# Common variables
variable "name" {
  type = string
}

variable "port" {
  type     = number
  nullable = true
  default  = null
}

variable "networks" {
  type = list(object({
    name = string
  }))
  default = []
}

variable "restart" {
  type    = string
  default = "unless-stopped"
}

# Default variables
variable "image_name" {
  type    = string
  default = "ghcr.io/foxfriends/inventory"
}

variable "image_version" {
  type    = string
  default = "main"
}

# Configuration variables
variable "config_dir" {
  type = string
}
