export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      AuditLog: {
        Row: {
          action: string
          actorUserId: string | null
          createdAt: string
          entityId: string
          entityType: string
          id: string
          ipAddress: string | null
          message: string
          metadata: Json | null
          userAgent: string | null
        }
        Insert: {
          action: string
          actorUserId?: string | null
          createdAt?: string
          entityId: string
          entityType: string
          id: string
          ipAddress?: string | null
          message: string
          metadata?: Json | null
          userAgent?: string | null
        }
        Update: {
          action?: string
          actorUserId?: string | null
          createdAt?: string
          entityId?: string
          entityType?: string
          id?: string
          ipAddress?: string | null
          message?: string
          metadata?: Json | null
          userAgent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AuditLog_actorUserId_fkey"
            columns: ["actorUserId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Ban: {
        Row: {
          activeFrom: string
          createdAt: string
          createdById: string
          deviceId: string | null
          expiresAt: string | null
          id: string
          ipAddress: string | null
          notes: string | null
          reason: string
          revokedAt: string | null
          sessionId: string | null
          targetType: Database["public"]["Enums"]["BanTargetType"]
          userId: string | null
        }
        Insert: {
          activeFrom?: string
          createdAt?: string
          createdById: string
          deviceId?: string | null
          expiresAt?: string | null
          id: string
          ipAddress?: string | null
          notes?: string | null
          reason: string
          revokedAt?: string | null
          sessionId?: string | null
          targetType: Database["public"]["Enums"]["BanTargetType"]
          userId?: string | null
        }
        Update: {
          activeFrom?: string
          createdAt?: string
          createdById?: string
          deviceId?: string | null
          expiresAt?: string | null
          id?: string
          ipAddress?: string | null
          notes?: string | null
          reason?: string
          revokedAt?: string | null
          sessionId?: string | null
          targetType?: Database["public"]["Enums"]["BanTargetType"]
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "Ban_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Ban_deviceId_fkey"
            columns: ["deviceId"]
            isOneToOne: false
            referencedRelation: "Device"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Ban_sessionId_fkey"
            columns: ["sessionId"]
            isOneToOne: false
            referencedRelation: "Session"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Ban_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Category: {
        Row: {
          createdAt: string
          description: string | null
          id: string
          name: string
          slug: string
          sortOrder: number
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          description?: string | null
          id: string
          name: string
          slug: string
          sortOrder?: number
          updatedAt: string
        }
        Update: {
          createdAt?: string
          description?: string | null
          id?: string
          name?: string
          slug?: string
          sortOrder?: number
          updatedAt?: string
        }
        Relationships: []
      }
      Course: {
        Row: {
          accessType: Database["public"]["Enums"]["CourseAccessType"]
          archivedAt: string | null
          approvedAt: string | null
          approvedById: string | null
          categoryId: string | null
          coverImageUrl: string | null
          createdAt: string
          description: string
          difficulty: string | null
          enrollmentCountCache: number
          estimatedHours: number | null
          id: string
          instructorId: string
          isFeatured: boolean
          isPremium: boolean
          lessonCountCache: number
          priceCents: number | null
          publishedAt: string | null
          reviewNotes: string | null
          shortDescription: string
          slug: string
          status: Database["public"]["Enums"]["CourseStatus"]
          subtitle: string | null
          submittedAt: string | null
          targetStudentYear: Database["public"]["Enums"]["StudentYear"]
          thumbnailUrl: string | null
          title: string
          updatedAt: string
        }
        Insert: {
          accessType?: Database["public"]["Enums"]["CourseAccessType"]
          archivedAt?: string | null
          approvedAt?: string | null
          approvedById?: string | null
          categoryId?: string | null
          coverImageUrl?: string | null
          createdAt?: string
          description: string
          difficulty?: string | null
          enrollmentCountCache?: number
          estimatedHours?: number | null
          id: string
          instructorId: string
          isFeatured?: boolean
          isPremium?: boolean
          lessonCountCache?: number
          priceCents?: number | null
          publishedAt?: string | null
          reviewNotes?: string | null
          shortDescription: string
          slug: string
          status?: Database["public"]["Enums"]["CourseStatus"]
          subtitle?: string | null
          submittedAt?: string | null
          targetStudentYear?: Database["public"]["Enums"]["StudentYear"]
          thumbnailUrl?: string | null
          title: string
          updatedAt: string
        }
        Update: {
          accessType?: Database["public"]["Enums"]["CourseAccessType"]
          archivedAt?: string | null
          approvedAt?: string | null
          approvedById?: string | null
          categoryId?: string | null
          coverImageUrl?: string | null
          createdAt?: string
          description?: string
          difficulty?: string | null
          enrollmentCountCache?: number
          estimatedHours?: number | null
          id?: string
          instructorId?: string
          isFeatured?: boolean
          isPremium?: boolean
          lessonCountCache?: number
          priceCents?: number | null
          publishedAt?: string | null
          reviewNotes?: string | null
          shortDescription?: string
          slug?: string
          status?: Database["public"]["Enums"]["CourseStatus"]
          subtitle?: string | null
          submittedAt?: string | null
          targetStudentYear?: Database["public"]["Enums"]["StudentYear"]
          thumbnailUrl?: string | null
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Course_approvedById_fkey"
            columns: ["approvedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Course_categoryId_fkey"
            columns: ["categoryId"]
            isOneToOne: false
            referencedRelation: "Category"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Course_instructorId_fkey"
            columns: ["instructorId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      CourseAnnouncement: {
        Row: {
          body: string
          courseId: string
          createdAt: string
          id: string
          instructorId: string
          publishedAt: string | null
          status: Database["public"]["Enums"]["AnnouncementStatus"]
          title: string
          updatedAt: string
        }
        Insert: {
          body: string
          courseId: string
          createdAt?: string
          id: string
          instructorId: string
          publishedAt?: string | null
          status?: Database["public"]["Enums"]["AnnouncementStatus"]
          title: string
          updatedAt: string
        }
        Update: {
          body?: string
          courseId?: string
          createdAt?: string
          id?: string
          instructorId?: string
          publishedAt?: string | null
          status?: Database["public"]["Enums"]["AnnouncementStatus"]
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "CourseAnnouncement_courseId_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "Course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CourseAnnouncement_instructorId_fkey"
            columns: ["instructorId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      CourseProgress: {
        Row: {
          completedLessonsCount: number
          courseId: string
          id: string
          lastLessonId: string | null
          progressPercent: number
          totalLessonsCount: number
          updatedAt: string
          userId: string
        }
        Insert: {
          completedLessonsCount?: number
          courseId: string
          id: string
          lastLessonId?: string | null
          progressPercent?: number
          totalLessonsCount?: number
          updatedAt: string
          userId: string
        }
        Update: {
          completedLessonsCount?: number
          courseId?: string
          id?: string
          lastLessonId?: string | null
          progressPercent?: number
          totalLessonsCount?: number
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "CourseProgress_courseId_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "Course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CourseProgress_lastLessonId_fkey"
            columns: ["lastLessonId"]
            isOneToOne: false
            referencedRelation: "Lesson"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "CourseProgress_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Device: {
        Row: {
          fingerprint: string
          firstIpAddress: string | null
          firstSeenAt: string
          id: string
          label: string
          lastIpAddress: string | null
          lastSeenAt: string
          revokedAt: string | null
          status: Database["public"]["Enums"]["DeviceStatus"]
          trustedAt: string | null
          userAgent: string | null
          userId: string
        }
        Insert: {
          fingerprint: string
          firstIpAddress?: string | null
          firstSeenAt?: string
          id: string
          label: string
          lastIpAddress?: string | null
          lastSeenAt?: string
          revokedAt?: string | null
          status?: Database["public"]["Enums"]["DeviceStatus"]
          trustedAt?: string | null
          userAgent?: string | null
          userId: string
        }
        Update: {
          fingerprint?: string
          firstIpAddress?: string | null
          firstSeenAt?: string
          id?: string
          label?: string
          lastIpAddress?: string | null
          lastSeenAt?: string
          revokedAt?: string | null
          status?: Database["public"]["Enums"]["DeviceStatus"]
          trustedAt?: string | null
          userAgent?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Device_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Enrollment: {
        Row: {
          completedAt: string | null
          courseId: string
          createdAt: string
          id: string
          lastLessonId: string | null
          paymentMethod: Database["public"]["Enums"]["PaymentMethod"] | null
          paymentScreenshotContentType: string | null
          paymentScreenshotStorageKey: string | null
          paymentSubmittedAt: string | null
          progressPercent: number
          reviewNotes: string | null
          reviewedAt: string | null
          reviewedById: string | null
          startedAt: string
          status: Database["public"]["Enums"]["EnrollmentStatus"]
          updatedAt: string
          userId: string
        }
        Insert: {
          completedAt?: string | null
          courseId: string
          createdAt?: string
          id: string
          lastLessonId?: string | null
          paymentMethod?: Database["public"]["Enums"]["PaymentMethod"] | null
          paymentScreenshotContentType?: string | null
          paymentScreenshotStorageKey?: string | null
          paymentSubmittedAt?: string | null
          progressPercent?: number
          reviewNotes?: string | null
          reviewedAt?: string | null
          reviewedById?: string | null
          startedAt?: string
          status?: Database["public"]["Enums"]["EnrollmentStatus"]
          updatedAt: string
          userId: string
        }
        Update: {
          completedAt?: string | null
          courseId?: string
          createdAt?: string
          id?: string
          lastLessonId?: string | null
          paymentMethod?: Database["public"]["Enums"]["PaymentMethod"] | null
          paymentScreenshotContentType?: string | null
          paymentScreenshotStorageKey?: string | null
          paymentSubmittedAt?: string | null
          progressPercent?: number
          reviewNotes?: string | null
          reviewedAt?: string | null
          reviewedById?: string | null
          startedAt?: string
          status?: Database["public"]["Enums"]["EnrollmentStatus"]
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Enrollment_courseId_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "Course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Enrollment_lastLessonId_fkey"
            columns: ["lastLessonId"]
            isOneToOne: false
            referencedRelation: "Lesson"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Enrollment_reviewedById_fkey"
            columns: ["reviewedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Enrollment_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      InstructorProfile: {
        Row: {
          approvedAt: string | null
          approvedById: string | null
          bio: string | null
          createdAt: string
          expertise: string[] | null
          id: string
          institution: string | null
          isApproved: boolean
          licenseNumber: string | null
          specialty: string
          title: string
          updatedAt: string
          userId: string
        }
        Insert: {
          approvedAt?: string | null
          approvedById?: string | null
          bio?: string | null
          createdAt?: string
          expertise?: string[] | null
          id: string
          institution?: string | null
          isApproved?: boolean
          licenseNumber?: string | null
          specialty: string
          title: string
          updatedAt: string
          userId: string
        }
        Update: {
          approvedAt?: string | null
          approvedById?: string | null
          bio?: string | null
          createdAt?: string
          expertise?: string[] | null
          id?: string
          institution?: string | null
          isApproved?: boolean
          licenseNumber?: string | null
          specialty?: string
          title?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "InstructorProfile_approvedById_fkey"
            columns: ["approvedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "InstructorProfile_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Lesson: {
        Row: {
          content: string | null
          courseId: string
          createdAt: string
          currentVideoAssetId: string | null
          durationSeconds: number | null
          id: string
          moduleId: string
          position: number
          slug: string
          status: Database["public"]["Enums"]["LessonStatus"]
          summary: string
          title: string
          updatedAt: string
          visibility: Database["public"]["Enums"]["LessonVisibility"]
        }
        Insert: {
          content?: string | null
          courseId: string
          createdAt?: string
          currentVideoAssetId?: string | null
          durationSeconds?: number | null
          id: string
          moduleId: string
          position: number
          slug: string
          status?: Database["public"]["Enums"]["LessonStatus"]
          summary: string
          title: string
          updatedAt: string
          visibility?: Database["public"]["Enums"]["LessonVisibility"]
        }
        Update: {
          content?: string | null
          courseId?: string
          createdAt?: string
          currentVideoAssetId?: string | null
          durationSeconds?: number | null
          id?: string
          moduleId?: string
          position?: number
          slug?: string
          status?: Database["public"]["Enums"]["LessonStatus"]
          summary?: string
          title?: string
          updatedAt?: string
          visibility?: Database["public"]["Enums"]["LessonVisibility"]
        }
        Relationships: [
          {
            foreignKeyName: "Lesson_courseId_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "Course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Lesson_currentVideoAssetId_fkey"
            columns: ["currentVideoAssetId"]
            isOneToOne: false
            referencedRelation: "VideoAsset"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Lesson_moduleId_fkey"
            columns: ["moduleId"]
            isOneToOne: false
            referencedRelation: "Module"
            referencedColumns: ["id"]
          },
        ]
      }
      LessonProgress: {
        Row: {
          completed: boolean
          completedAt: string | null
          courseId: string
          id: string
          lastPositionSeconds: number
          lessonId: string
          secondsWatched: number
          updatedAt: string
          userId: string
          watchCount: number
        }
        Insert: {
          completed?: boolean
          completedAt?: string | null
          courseId: string
          id: string
          lastPositionSeconds?: number
          lessonId: string
          secondsWatched?: number
          updatedAt: string
          userId: string
          watchCount?: number
        }
        Update: {
          completed?: boolean
          completedAt?: string | null
          courseId?: string
          id?: string
          lastPositionSeconds?: number
          lessonId?: string
          secondsWatched?: number
          updatedAt?: string
          userId?: string
          watchCount?: number
        }
        Relationships: [
          {
            foreignKeyName: "LessonProgress_lessonId_fkey"
            columns: ["lessonId"]
            isOneToOne: false
            referencedRelation: "Lesson"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "LessonProgress_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Module: {
        Row: {
          courseId: string
          createdAt: string
          description: string | null
          id: string
          position: number
          title: string
          updatedAt: string
        }
        Insert: {
          courseId: string
          createdAt?: string
          description?: string | null
          id: string
          position: number
          title: string
          updatedAt: string
        }
        Update: {
          courseId?: string
          createdAt?: string
          description?: string | null
          id?: string
          position?: number
          title?: string
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Module_courseId_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "Course"
            referencedColumns: ["id"]
          },
        ]
      }
      Notification: {
        Row: {
          actionUrl: string | null
          createdAt: string
          id: string
          message: string
          readAt: string | null
          status: Database["public"]["Enums"]["NotificationStatus"]
          title: string
          type: Database["public"]["Enums"]["NotificationType"]
          userId: string
        }
        Insert: {
          actionUrl?: string | null
          createdAt?: string
          id: string
          message: string
          readAt?: string | null
          status?: Database["public"]["Enums"]["NotificationStatus"]
          title: string
          type: Database["public"]["Enums"]["NotificationType"]
          userId: string
        }
        Update: {
          actionUrl?: string | null
          createdAt?: string
          id?: string
          message?: string
          readAt?: string | null
          status?: Database["public"]["Enums"]["NotificationStatus"]
          title?: string
          type?: Database["public"]["Enums"]["NotificationType"]
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Notification_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Profile: {
        Row: {
          avatarUrl: string | null
          bio: string | null
          city: string | null
          country: string | null
          createdAt: string
          fullName: string
          id: string
          phone: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          avatarUrl?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          createdAt?: string
          fullName: string
          id: string
          phone?: string | null
          updatedAt: string
          userId: string
        }
        Update: {
          avatarUrl?: string | null
          bio?: string | null
          city?: string | null
          country?: string | null
          createdAt?: string
          fullName?: string
          id?: string
          phone?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Profile_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Resource: {
        Row: {
          courseId: string | null
          createdAt: string
          description: string | null
          externalUrl: string | null
          fileName: string | null
          id: string
          lessonId: string | null
          sizeBytes: number | null
          storageKey: string | null
          title: string
          type: Database["public"]["Enums"]["ResourceType"]
          updatedAt: string
        }
        Insert: {
          courseId?: string | null
          createdAt?: string
          description?: string | null
          externalUrl?: string | null
          fileName?: string | null
          id: string
          lessonId?: string | null
          sizeBytes?: number | null
          storageKey?: string | null
          title: string
          type: Database["public"]["Enums"]["ResourceType"]
          updatedAt: string
        }
        Update: {
          courseId?: string | null
          createdAt?: string
          description?: string | null
          externalUrl?: string | null
          fileName?: string | null
          id?: string
          lessonId?: string | null
          sizeBytes?: number | null
          storageKey?: string | null
          title?: string
          type?: Database["public"]["Enums"]["ResourceType"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Resource_courseId_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "Course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Resource_lessonId_fkey"
            columns: ["lessonId"]
            isOneToOne: false
            referencedRelation: "Lesson"
            referencedColumns: ["id"]
          },
        ]
      }
      Session: {
        Row: {
          createdAt: string
          deviceId: string
          expiresAt: string
          id: string
          ipAddress: string | null
          lastSeenAt: string
          revokedAt: string | null
          revokedReason: string | null
          status: Database["public"]["Enums"]["SessionStatus"]
          tokenHash: string
          userAgent: string | null
          userId: string
        }
        Insert: {
          createdAt?: string
          deviceId: string
          expiresAt: string
          id: string
          ipAddress?: string | null
          lastSeenAt?: string
          revokedAt?: string | null
          revokedReason?: string | null
          status?: Database["public"]["Enums"]["SessionStatus"]
          tokenHash: string
          userAgent?: string | null
          userId: string
        }
        Update: {
          createdAt?: string
          deviceId?: string
          expiresAt?: string
          id?: string
          ipAddress?: string | null
          lastSeenAt?: string
          revokedAt?: string | null
          revokedReason?: string | null
          status?: Database["public"]["Enums"]["SessionStatus"]
          tokenHash?: string
          userAgent?: string | null
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Session_deviceId_fkey"
            columns: ["deviceId"]
            isOneToOne: false
            referencedRelation: "Device"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Session_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      SiteSetting: {
        Row: {
          createdAt: string
          group: string
          id: string
          key: string
          label: string
          updatedAt: string
          updatedById: string | null
          value: Json
        }
        Insert: {
          createdAt?: string
          group: string
          id: string
          key: string
          label: string
          updatedAt: string
          updatedById?: string | null
          value: Json
        }
        Update: {
          createdAt?: string
          group?: string
          id?: string
          key?: string
          label?: string
          updatedAt?: string
          updatedById?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "SiteSetting_updatedById_fkey"
            columns: ["updatedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Subscription: {
        Row: {
          canceledAt: string | null
          createdAt: string
          currency: string
          endsAt: string | null
          gatewayCustomerId: string | null
          gatewaySubscriptionId: string | null
          id: string
          planCode: string
          planName: string
          priceCents: number
          startsAt: string
          status: Database["public"]["Enums"]["SubscriptionStatus"]
          trialEndsAt: string | null
          updatedAt: string
          userId: string
        }
        Insert: {
          canceledAt?: string | null
          createdAt?: string
          currency?: string
          endsAt?: string | null
          gatewayCustomerId?: string | null
          gatewaySubscriptionId?: string | null
          id: string
          planCode: string
          planName: string
          priceCents: number
          startsAt: string
          status?: Database["public"]["Enums"]["SubscriptionStatus"]
          trialEndsAt?: string | null
          updatedAt: string
          userId: string
        }
        Update: {
          canceledAt?: string | null
          createdAt?: string
          currency?: string
          endsAt?: string | null
          gatewayCustomerId?: string | null
          gatewaySubscriptionId?: string | null
          id?: string
          planCode?: string
          planName?: string
          priceCents?: number
          startsAt?: string
          status?: Database["public"]["Enums"]["SubscriptionStatus"]
          trialEndsAt?: string | null
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Subscription_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      SuspiciousEvent: {
        Row: {
          createdAt: string
          deviceId: string | null
          id: string
          metadata: Json | null
          reason: string
          resolvedAt: string | null
          resolvedById: string | null
          sessionId: string | null
          severity: number
          status: Database["public"]["Enums"]["SuspiciousEventStatus"]
          type: Database["public"]["Enums"]["SuspiciousEventType"]
          userId: string | null
        }
        Insert: {
          createdAt?: string
          deviceId?: string | null
          id: string
          metadata?: Json | null
          reason: string
          resolvedAt?: string | null
          resolvedById?: string | null
          sessionId?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["SuspiciousEventStatus"]
          type: Database["public"]["Enums"]["SuspiciousEventType"]
          userId?: string | null
        }
        Update: {
          createdAt?: string
          deviceId?: string | null
          id?: string
          metadata?: Json | null
          reason?: string
          resolvedAt?: string | null
          resolvedById?: string | null
          sessionId?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["SuspiciousEventStatus"]
          type?: Database["public"]["Enums"]["SuspiciousEventType"]
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "SuspiciousEvent_deviceId_fkey"
            columns: ["deviceId"]
            isOneToOne: false
            referencedRelation: "Device"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SuspiciousEvent_resolvedById_fkey"
            columns: ["resolvedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SuspiciousEvent_sessionId_fkey"
            columns: ["sessionId"]
            isOneToOne: false
            referencedRelation: "Session"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "SuspiciousEvent_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      UploadJob: {
        Row: {
          canceledAt: string | null
          chunkSize: number
          completedAt: string | null
          courseId: string
          createdAt: string
          durationSeconds: number | null
          errorMessage: string | null
          fileName: string
          finalStorageKey: string
          id: string
          instructorId: string
          lessonId: string
          mimeType: string
          processingFinishedAt: string | null
          processingStartedAt: string | null
          receivedBytes: number
          replacementForAssetId: string | null
          sizeBytes: number
          status: Database["public"]["Enums"]["UploadJobStatus"]
          tempStorageKey: string
          totalChunks: number
          updatedAt: string
          uploadedChunks: number[] | null
        }
        Insert: {
          canceledAt?: string | null
          chunkSize: number
          completedAt?: string | null
          courseId: string
          createdAt?: string
          durationSeconds?: number | null
          errorMessage?: string | null
          fileName: string
          finalStorageKey: string
          id: string
          instructorId: string
          lessonId: string
          mimeType: string
          processingFinishedAt?: string | null
          processingStartedAt?: string | null
          receivedBytes?: number
          replacementForAssetId?: string | null
          sizeBytes: number
          status?: Database["public"]["Enums"]["UploadJobStatus"]
          tempStorageKey: string
          totalChunks: number
          updatedAt: string
          uploadedChunks?: number[] | null
        }
        Update: {
          canceledAt?: string | null
          chunkSize?: number
          completedAt?: string | null
          courseId?: string
          createdAt?: string
          durationSeconds?: number | null
          errorMessage?: string | null
          fileName?: string
          finalStorageKey?: string
          id?: string
          instructorId?: string
          lessonId?: string
          mimeType?: string
          processingFinishedAt?: string | null
          processingStartedAt?: string | null
          receivedBytes?: number
          replacementForAssetId?: string | null
          sizeBytes?: number
          status?: Database["public"]["Enums"]["UploadJobStatus"]
          tempStorageKey?: string
          totalChunks?: number
          updatedAt?: string
          uploadedChunks?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "UploadJob_courseId_fkey"
            columns: ["courseId"]
            isOneToOne: false
            referencedRelation: "Course"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "UploadJob_instructorId_fkey"
            columns: ["instructorId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "UploadJob_lessonId_fkey"
            columns: ["lessonId"]
            isOneToOne: false
            referencedRelation: "Lesson"
            referencedColumns: ["id"]
          },
        ]
      }
      User: {
        Row: {
          createdAt: string
          deviceLimitOverride: number | null
          email: string
          emailVerifiedAt: string | null
          firstName: string
          id: string
          lastLoginAt: string | null
          lastName: string
          passwordHash: string
          role: Database["public"]["Enums"]["Role"]
          sessionLimitOverride: number | null
          status: Database["public"]["Enums"]["UserStatus"]
          studentYear: Database["public"]["Enums"]["StudentYear"] | null
          suspensionReason: string | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          deviceLimitOverride?: number | null
          email: string
          emailVerifiedAt?: string | null
          firstName: string
          id: string
          lastLoginAt?: string | null
          lastName: string
          passwordHash: string
          role?: Database["public"]["Enums"]["Role"]
          sessionLimitOverride?: number | null
          status?: Database["public"]["Enums"]["UserStatus"]
          studentYear?: Database["public"]["Enums"]["StudentYear"] | null
          suspensionReason?: string | null
          updatedAt: string
        }
        Update: {
          createdAt?: string
          deviceLimitOverride?: number | null
          email?: string
          emailVerifiedAt?: string | null
          firstName?: string
          id?: string
          lastLoginAt?: string | null
          lastName?: string
          passwordHash?: string
          role?: Database["public"]["Enums"]["Role"]
          sessionLimitOverride?: number | null
          status?: Database["public"]["Enums"]["UserStatus"]
          studentYear?: Database["public"]["Enums"]["StudentYear"] | null
          suspensionReason?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      VideoAsset: {
        Row: {
          checksum: string | null
          createdAt: string
          drmProvider: string | null
          durationSeconds: number | null
          fileName: string
          height: number | null
          id: string
          kinescope_id: string | null
          lessonId: string
          mimeType: string
          originalUploadJobId: string | null
          processingError: string | null
          readyAt: string | null
          replacedAt: string | null
          sizeBytes: number
          status: Database["public"]["Enums"]["VideoAssetStatus"]
          storageKey: string
          thumbnailStorageKey: string | null
          updatedAt: string
          version: number
          width: number | null
        }
        Insert: {
          checksum?: string | null
          createdAt?: string
          drmProvider?: string | null
          durationSeconds?: number | null
          fileName: string
          height?: number | null
          id: string
          kinescope_id?: string | null
          lessonId: string
          mimeType: string
          originalUploadJobId?: string | null
          processingError?: string | null
          readyAt?: string | null
          replacedAt?: string | null
          sizeBytes: number
          status?: Database["public"]["Enums"]["VideoAssetStatus"]
          storageKey: string
          thumbnailStorageKey?: string | null
          updatedAt: string
          version?: number
          width?: number | null
        }
        Update: {
          checksum?: string | null
          createdAt?: string
          drmProvider?: string | null
          durationSeconds?: number | null
          fileName?: string
          height?: number | null
          id?: string
          kinescope_id?: string | null
          lessonId?: string
          mimeType?: string
          originalUploadJobId?: string | null
          processingError?: string | null
          readyAt?: string | null
          replacedAt?: string | null
          sizeBytes?: number
          status?: Database["public"]["Enums"]["VideoAssetStatus"]
          storageKey?: string
          thumbnailStorageKey?: string | null
          updatedAt?: string
          version?: number
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "VideoAsset_lessonId_fkey"
            columns: ["lessonId"]
            isOneToOne: false
            referencedRelation: "Lesson"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "VideoAsset_originalUploadJobId_fkey"
            columns: ["originalUploadJobId"]
            isOneToOne: false
            referencedRelation: "UploadJob"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      AnnouncementStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED"
      BanTargetType: "USER" | "DEVICE" | "SESSION" | "IP"
      CourseAccessType: "FREE" | "PAID"
      CourseStatus: "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED"
      DeviceStatus: "ACTIVE" | "REVOKED" | "BLOCKED"
      EnrollmentStatus: "ACTIVE" | "COMPLETED" | "PAUSED" | "REVOKED" | "PENDING" | "REJECTED"
      LessonStatus: "DRAFT" | "PUBLISHED" | "ARCHIVED"
      LessonVisibility: "PREVIEW" | "PREMIUM"
      NotificationStatus: "UNREAD" | "READ" | "DISMISSED"
      NotificationType: "INFO" | "WARNING" | "SUCCESS" | "SECURITY"
      PaymentMethod: "VODAFONE_CASH" | "INSTAPAY"
      ResourceType: "PDF" | "FILE" | "LINK" | "IMAGE"
      Role: "STUDENT" | "INSTRUCTOR" | "ADMIN" | "SUPER_ADMIN"
      SessionStatus: "ACTIVE" | "REVOKED" | "EXPIRED"
      StudentYear: "YEAR_1" | "YEAR_2" | "YEAR_3" | "YEAR_4" | "YEAR_5"
      SubscriptionStatus: "ACTIVE" | "EXPIRED" | "CANCELED" | "TRIAL" | "BANNED"
      SuspiciousEventStatus: "OPEN" | "REVIEWING" | "RESOLVED" | "DISMISSED"
      SuspiciousEventType:
        | "SESSION_LIMIT_EXCEEDED"
        | "SIMULTANEOUS_USAGE"
        | "GEO_VELOCITY"
        | "RAPID_DEVICE_SWITCH"
        | "MULTIPLE_CONCURRENT_STREAMS"
        | "ADMIN_FLAG"
      UploadJobStatus:
        | "CREATED"
        | "UPLOADING"
        | "QUEUED"
        | "PROCESSING"
        | "READY"
        | "FAILED"
        | "CANCELED"
      UserStatus: "ACTIVE" | "SUSPENDED" | "BANNED"
      VideoAssetStatus:
        | "QUEUED"
        | "UPLOADING"
        | "PROCESSING"
        | "READY"
        | "FAILED"
        | "REPLACED"
        | "DELETED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      AnnouncementStatus: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      BanTargetType: ["USER", "DEVICE", "SESSION", "IP"],
      CourseAccessType: ["FREE", "PAID"],
      CourseStatus: ["DRAFT", "REVIEW", "PUBLISHED", "ARCHIVED"],
      DeviceStatus: ["ACTIVE", "REVOKED", "BLOCKED"],
      EnrollmentStatus: ["ACTIVE", "COMPLETED", "PAUSED", "REVOKED", "PENDING", "REJECTED"],
      LessonStatus: ["DRAFT", "PUBLISHED", "ARCHIVED"],
      LessonVisibility: ["PREVIEW", "PREMIUM"],
      NotificationStatus: ["UNREAD", "READ", "DISMISSED"],
      NotificationType: ["INFO", "WARNING", "SUCCESS", "SECURITY"],
      PaymentMethod: ["VODAFONE_CASH", "INSTAPAY"],
      ResourceType: ["PDF", "FILE", "LINK", "IMAGE"],
      Role: ["STUDENT", "INSTRUCTOR", "ADMIN", "SUPER_ADMIN"],
      SessionStatus: ["ACTIVE", "REVOKED", "EXPIRED"],
      StudentYear: ["YEAR_1", "YEAR_2", "YEAR_3", "YEAR_4", "YEAR_5"],
      SubscriptionStatus: ["ACTIVE", "EXPIRED", "CANCELED", "TRIAL", "BANNED"],
      SuspiciousEventStatus: ["OPEN", "REVIEWING", "RESOLVED", "DISMISSED"],
      SuspiciousEventType: [
        "SESSION_LIMIT_EXCEEDED",
        "SIMULTANEOUS_USAGE",
        "GEO_VELOCITY",
        "RAPID_DEVICE_SWITCH",
        "MULTIPLE_CONCURRENT_STREAMS",
        "ADMIN_FLAG",
      ],
      UploadJobStatus: [
        "CREATED",
        "UPLOADING",
        "QUEUED",
        "PROCESSING",
        "READY",
        "FAILED",
        "CANCELED",
      ],
      UserStatus: ["ACTIVE", "SUSPENDED", "BANNED"],
      VideoAssetStatus: [
        "QUEUED",
        "UPLOADING",
        "PROCESSING",
        "READY",
        "FAILED",
        "REPLACED",
        "DELETED",
      ],
    },
  },
} as const
