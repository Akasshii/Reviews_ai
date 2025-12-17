package entity

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID        uuid.UUID  `json:"id"`
	Email     string     `json:"email"`
	Password  string     `json:"-"`
	Name      string     `json:"name"`
	Role      string     `json:"role"`
	Company   *string    `json:"company,omitempty"`
	Position  *string    `json:"position,omitempty"`
	Avatar    *string    `json:"avatar,omitempty"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
}

type CreateUserDTO struct {
	Email    string  `json:"email" binding:"required,email"`
	Password string  `json:"password" binding:"required,min=6"`
	Name     string  `json:"name" binding:"required"`
	Company  *string `json:"company"`
	Position *string `json:"position"`
}

type UpdateUserDTO struct {
	Name     *string `json:"name"`
	Company  *string `json:"company"`
	Position *string `json:"position"`
	Avatar   *string `json:"avatar"`
}

type LoginDTO struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  *User  `json:"user"`
}
