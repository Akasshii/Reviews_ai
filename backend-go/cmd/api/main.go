package main

import (
	"log"
	"os"
	"reviews-ai/internal/application/usecase"
	"reviews-ai/internal/infrastructure/ai"
	"reviews-ai/internal/infrastructure/database"
	"reviews-ai/internal/infrastructure/parser"
	"reviews-ai/internal/presentation/handler"
	"reviews-ai/internal/presentation/middleware"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize database
	db, err := database.NewPostgresDB()
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Initialize repositories
	userRepo := database.NewUserRepository(db)
	reportRepo := database.NewReportRepository(db)
	reviewRepo := database.NewReviewRepository(db)

	// Initialize infrastructure services
	aiClient := ai.NewOpenRouterClient()
	browserManager := parser.NewBrowserManager()
	defer browserManager.Close()

	rateLimiter := parser.NewRateLimiter()
	yandexParser := parser.NewYandexParser(browserManager, rateLimiter)
	twoGisParser := parser.NewTwoGisParser(browserManager, rateLimiter)
	parserRegistry := parser.NewParserRegistry(yandexParser, twoGisParser)

	// Initialize use cases
	authUseCase := usecase.NewAuthUseCase(userRepo)
	userUseCase := usecase.NewUserUseCase(userRepo)
	reportUseCase := usecase.NewReportUseCase(reportRepo, reviewRepo, aiClient, parserRegistry)

	// Initialize handlers
	authHandler := handler.NewAuthHandler(authUseCase)
	userHandler := handler.NewUserHandler(userUseCase)
	reportHandler := handler.NewReportHandler(reportUseCase)

	// Setup Gin
	ginMode := os.Getenv("GIN_MODE")
	if ginMode != "" {
		gin.SetMode(ginMode)
	}

	router := gin.Default()

	// Apply middleware
	router.Use(middleware.CORSMiddleware())

	// Health check
	router.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "reviews-ai",
		})
	})

	// Public routes
	api := router.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
		}
	}

	// Protected routes
	protected := api.Group("")
	protected.Use(middleware.AuthMiddleware())
	{
		// User routes
		user := protected.Group("/user")
		{
			user.GET("/profile", userHandler.GetProfile)
			user.PUT("/profile", userHandler.UpdateProfile)
			user.PUT("/password", userHandler.ChangePassword)
		}

		// Report routes
		reports := protected.Group("/reports")
		{
			reports.POST("", reportHandler.CreateReport)
			reports.GET("", reportHandler.GetReports)
			reports.GET("/:id", reportHandler.GetReportByID)
			reports.DELETE("/:id", reportHandler.DeleteReport)
		}
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "3001"
	}

	log.Printf("Server starting on port %s...", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
