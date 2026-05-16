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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          category: Database["public"]["Enums"]["achievement_category"]
          description: string | null
          icon_url: string | null
          id: string
          name: string
          rarity: Database["public"]["Enums"]["achievement_rarity"]
          slug: string
        }
        Insert: {
          category: Database["public"]["Enums"]["achievement_category"]
          description?: string | null
          icon_url?: string | null
          id?: string
          name: string
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          slug: string
        }
        Update: {
          category?: Database["public"]["Enums"]["achievement_category"]
          description?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          rarity?: Database["public"]["Enums"]["achievement_rarity"]
          slug?: string
        }
        Relationships: []
      }
      app_versions: {
        Row: {
          changelog: string | null
          is_mandatory: boolean
          platform: Database["public"]["Enums"]["app_platform"]
          version: string
        }
        Insert: {
          changelog?: string | null
          is_mandatory?: boolean
          platform: Database["public"]["Enums"]["app_platform"]
          version: string
        }
        Update: {
          changelog?: string | null
          is_mandatory?: boolean
          platform?: Database["public"]["Enums"]["app_platform"]
          version?: string
        }
        Relationships: []
      }
      ai_tutor_mindmaps: {
        Row: {
          created_at: string
          document: Json
          id: string
          source_document_ids: string[]
          title: string
          updated_at: string
          user_id: string
          user_prompt: string
        }
        Insert: {
          created_at?: string
          document: Json
          id?: string
          source_document_ids?: string[]
          title: string
          updated_at?: string
          user_id: string
          user_prompt?: string
        }
        Update: {
          created_at?: string
          document?: Json
          id?: string
          source_document_ids?: string[]
          title?: string
          updated_at?: string
          user_id?: string
          user_prompt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_tutor_mindmaps_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      block_interactions: {
        Row: {
          block_id: string
          created_at: string
          id: string
          is_correct: boolean | null
          user_id: string
          user_input: Json | null
        }
        Insert: {
          block_id: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          user_id: string
          user_input?: Json | null
        }
        Update: {
          block_id?: string
          created_at?: string
          id?: string
          is_correct?: boolean | null
          user_id?: string
          user_input?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "block_interactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_conversation_members: {
        Row: {
          conversation_id: string
          joined_at: string
          last_read_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          joined_at?: string
          last_read_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          joined_at?: string
          last_read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_conversation_members_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "community_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_conversation_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_conversations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["community_conversation_kind"]
          study_room_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          kind?: Database["public"]["Enums"]["community_conversation_kind"]
          study_room_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          kind?: Database["public"]["Enums"]["community_conversation_kind"]
          study_room_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_conversations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_conversations_study_room_id_fkey"
            columns: ["study_room_id"]
            isOneToOne: true
            referencedRelation: "community_study_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      community_discussion_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          discussion_id: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          discussion_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          discussion_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_discussion_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_discussion_comments_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "community_discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      community_discussion_likes: {
        Row: {
          created_at: string
          discussion_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          discussion_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          discussion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_discussion_likes_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "community_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_discussion_likes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_discussions: {
        Row: {
          author_id: string
          body: string
          category: string
          created_at: string
          id: string
          title: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          category?: string
          created_at?: string
          id?: string
          title: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          category?: string
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_discussions_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_messages: {
        Row: {
          author_id: string
          body: string
          conversation_id: string
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_messages_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "community_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      community_notes: {
        Row: {
          body: string
          created_at: string
          id: string
          lesson_id: string | null
          owner_id: string
          room_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          owner_id: string
          room_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          lesson_id?: string | null
          owner_id?: string
          room_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_notes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_notes_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_notes_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "community_study_rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      community_study_room_members: {
        Row: {
          joined_at: string
          room_id: string
          user_id: string
        }
        Insert: {
          joined_at?: string
          room_id: string
          user_id: string
        }
        Update: {
          joined_at?: string
          room_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_study_room_members_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "community_study_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "community_study_room_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      community_study_rooms: {
        Row: {
          created_at: string
          created_by: string
          description: string
          id: string
          name: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string
          id?: string
          name: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string
          id?: string
          name?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_study_rooms_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_analytics_baselines: {
        Row: {
          course_id: string
          seeded_at: string
          seeded_view_count: number
        }
        Insert: {
          course_id: string
          seeded_at?: string
          seeded_view_count?: number
        }
        Update: {
          course_id?: string
          seeded_at?: string
          seeded_view_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_analytics_baselines_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_feedback: {
        Row: {
          comment: string | null
          course_id: string
          created_at: string
          id: string
          rating: number
          user_id: string
        }
        Insert: {
          comment?: string | null
          course_id: string
          created_at?: string
          id?: string
          rating: number
          user_id: string
        }
        Update: {
          comment?: string | null
          course_id?: string
          created_at?: string
          id?: string
          rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_feedback_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          animation_style: string | null
          author_id: string
          content_language: string | null
          created_at: string
          description: string | null
          difficulty_level: Database["public"]["Enums"]["difficulty_level"]
          estimated_minutes: number
          id: string
          planning_json: Json | null
          price: number
          price_tier: Database["public"]["Enums"]["price_tier"]
          published_at: string | null
          search_tsv: unknown
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          subject_id: string | null
          tags: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }
        Insert: {
          animation_style?: string | null
          author_id: string
          content_language?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: Database["public"]["Enums"]["difficulty_level"]
          estimated_minutes?: number
          id?: string
          planning_json?: Json | null
          price?: number
          price_tier?: Database["public"]["Enums"]["price_tier"]
          published_at?: string | null
          search_tsv?: unknown
          slug: string
          status?: Database["public"]["Enums"]["course_status"]
          subject_id?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          animation_style?: string | null
          author_id?: string
          content_language?: string | null
          created_at?: string
          description?: string | null
          difficulty_level?: Database["public"]["Enums"]["difficulty_level"]
          estimated_minutes?: number
          id?: string
          planning_json?: Json | null
          price?: number
          price_tier?: Database["public"]["Enums"]["price_tier"]
          published_at?: string | null
          search_tsv?: unknown
          slug?: string
          status?: Database["public"]["Enums"]["course_status"]
          subject_id?: string | null
          tags?: string[]
          thumbnail_url?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_activity_log: {
        Row: {
          date: string
          lessons_count: number
          user_id: string
          xp_earned: number
        }
        Insert: {
          date: string
          lessons_count?: number
          user_id: string
          xp_earned?: number
        }
        Update: {
          date?: string
          lessons_count?: number
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "daily_activity_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          current_value: number
          display_label: string
          id: string
          is_completed: boolean
          reward_xp: number
          target_value: number
          task_date: string
          task_type: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          display_label: string
          id?: string
          is_completed?: boolean
          reward_xp?: number
          target_value?: number
          task_date: string
          task_type: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          current_value?: number
          display_label?: string
          id?: string
          is_completed?: boolean
          reward_xp?: number
          target_value?: number
          task_date?: string
          task_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_tasks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          course_id: string
          id: string
          last_accessed_at: string
          progress_bp: number
          started_at: string
          status: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          id?: string
          last_accessed_at?: string
          progress_bp?: number
          started_at?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          id?: string
          last_accessed_at?: string
          progress_bp?: number
          started_at?: string
          status?: Database["public"]["Enums"]["enrollment_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string
          follower_id: string
          following_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          following_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          following_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_following_id_fkey"
            columns: ["following_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_completions: {
        Row: {
          completed_at: string
          correct_count: number
          id: string
          lesson_id: string
          score: number | null
          time_spent_seconds: number | null
          total_count: number
          user_id: string
        }
        Insert: {
          completed_at?: string
          correct_count?: number
          id?: string
          lesson_id: string
          score?: number | null
          time_spent_seconds?: number | null
          total_count?: number
          user_id: string
        }
        Update: {
          completed_at?: string
          correct_count?: number
          id?: string
          lesson_id?: string
          score?: number | null
          time_spent_seconds?: number | null
          total_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_completions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          content_hash: string | null
          content_json: Json
          course_id: string
          created_at: string
          duration_seconds: number
          id: string
          is_locked: boolean
          paywall_product_id: string | null
          prerequisite_lesson_id: string | null
          sort_key: number
          title: string
          type: Database["public"]["Enums"]["lesson_type"]
          unlock_type: Database["public"]["Enums"]["lesson_unlock_type"]
          updated_at: string
          xp_reward: number
        }
        Insert: {
          content_hash?: string | null
          content_json?: Json
          course_id: string
          created_at?: string
          duration_seconds?: number
          id?: string
          is_locked?: boolean
          paywall_product_id?: string | null
          prerequisite_lesson_id?: string | null
          sort_key?: number
          title: string
          type?: Database["public"]["Enums"]["lesson_type"]
          unlock_type?: Database["public"]["Enums"]["lesson_unlock_type"]
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          content_hash?: string | null
          content_json?: Json
          course_id?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          is_locked?: boolean
          paywall_product_id?: string | null
          prerequisite_lesson_id?: string | null
          sort_key?: number
          title?: string
          type?: Database["public"]["Enums"]["lesson_type"]
          unlock_type?: Database["public"]["Enums"]["lesson_unlock_type"]
          updated_at?: string
          xp_reward?: number
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_prerequisite_lesson_id_fkey"
            columns: ["prerequisite_lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          cover_image_url: string | null
          created_at: string
          id: string
          last_active_at: string | null
          pinned_achievement_ids: string[]
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          id: string
          last_active_at?: string | null
          pinned_achievement_ids?: string[]
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          cover_image_url?: string | null
          created_at?: string
          id?: string
          last_active_at?: string | null
          pinned_achievement_ids?: string[]
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      subjects: {
        Row: {
          color_hex: string | null
          icon_url: string | null
          id: string
          name: string
          parent_subject_id: string | null
        }
        Insert: {
          color_hex?: string | null
          icon_url?: string | null
          id?: string
          name: string
          parent_subject_id?: string | null
        }
        Update: {
          color_hex?: string | null
          icon_url?: string | null
          id?: string
          name?: string
          parent_subject_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subjects_parent_subject_id_fkey"
            columns: ["parent_subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          end_date: string | null
          id: string
          plan_id: string
          start_date: string
          status: Database["public"]["Enums"]["subscription_status"]
          user_id: string
        }
        Insert: {
          end_date?: string | null
          id?: string
          plan_id: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          user_id: string
        }
        Update: {
          end_date?: string | null
          id?: string
          plan_id?: string
          start_date?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_documents: {
        Row: {
          created_at: string
          display_title: string | null
          extracted_chars: number
          extracted_text: string
          filename: string
          id: string
          mime_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_title?: string | null
          extracted_chars?: number
          extracted_text: string
          filename: string
          id?: string
          mime_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_title?: string | null
          extracted_chars?: number
          extracted_text?: string
          filename?: string
          id?: string
          mime_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_documents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_achievements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_settings: {
        Row: {
          accessibility_mode: boolean
          language: string
          marketing_emails: boolean
          notification_daily_reminder: boolean
          notification_reminder_time: string
          theme_mode: Database["public"]["Enums"]["theme_mode"]
          user_id: string
        }
        Insert: {
          accessibility_mode?: boolean
          language?: string
          marketing_emails?: boolean
          notification_daily_reminder?: boolean
          notification_reminder_time?: string
          theme_mode?: Database["public"]["Enums"]["theme_mode"]
          user_id: string
        }
        Update: {
          accessibility_mode?: boolean
          language?: string
          marketing_emails?: boolean
          notification_daily_reminder?: boolean
          notification_reminder_time?: string
          theme_mode?: Database["public"]["Enums"]["theme_mode"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          courses_completed: number
          current_streak: number
          last_activity_date: string | null
          lessons_completed: number
          longest_streak: number
          total_xp: number
          user_id: string
        }
        Insert: {
          courses_completed?: number
          current_streak?: number
          last_activity_date?: string | null
          lessons_completed?: number
          longest_streak?: number
          total_xp?: number
          user_id: string
        }
        Update: {
          courses_completed?: number
          current_streak?: number
          last_activity_date?: string | null
          lessons_completed?: number
          longest_streak?: number
          total_xp?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      viewer_analytics_events: {
        Row: {
          actor_id: string
          course_id: string
          event_type: Database["public"]["Enums"]["viewer_analytics_event_type"]
          id: string
          lesson_id: string | null
          occurred_at: string
        }
        Insert: {
          actor_id: string
          course_id: string
          event_type: Database["public"]["Enums"]["viewer_analytics_event_type"]
          id?: string
          lesson_id?: string | null
          occurred_at?: string
        }
        Update: {
          actor_id?: string
          course_id?: string
          event_type?: Database["public"]["Enums"]["viewer_analytics_event_type"]
          id?: string
          lesson_id?: string | null
          occurred_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewer_analytics_events_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewer_analytics_events_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewer_analytics_events_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      web_push_subscriptions: {
        Row: {
          active: boolean
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_sent_at: string | null
          p256dh: string
          permission_state: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          active?: boolean
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_sent_at?: string | null
          p256dh: string
          permission_state?: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          active?: boolean
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_sent_at?: string | null
          p256dh?: string
          permission_state?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "web_push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      xp_transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          reference_id: string | null
          source_type: Database["public"]["Enums"]["xp_source_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          reference_id?: string | null
          source_type: Database["public"]["Enums"]["xp_source_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          reference_id?: string | null
          source_type?: Database["public"]["Enums"]["xp_source_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "xp_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_viewer_achievements: {
        Args: {
          p_accuracy_pct?: number
          p_time_spent_seconds?: number
          p_user_id: string
        }
        Returns: Json
      }
      complete_lesson_and_award_xp:
        | {
            Args: { p_lesson_id: string; p_score?: number; p_seconds?: number }
            Returns: undefined
          }
        | {
            Args: {
              p_correct_count?: number
              p_lesson_id: string
              p_score?: number
              p_seconds?: number
              p_total_count?: number
            }
            Returns: Json
          }
      create_or_get_direct_conversation: {
        Args: { p_other_user_id: string }
        Returns: string
      }
      get_author_dashboard_analytics: {
        Args: { p_days?: number; p_months?: number }
        Returns: Json
      }
      join_study_room: { Args: { p_room_id: string }; Returns: Json }
      publish_course: { Args: { p_course_id: string }; Returns: undefined }
      search_courses: {
        Args: {
          p_difficulty?: Database["public"]["Enums"]["difficulty_level"]
          p_limit?: number
          p_offset?: number
          p_query?: string
          p_subject_id?: string
          p_tags?: string[]
        }
        Returns: {
          animation_style: string | null
          author_id: string
          content_language: string | null
          created_at: string
          description: string | null
          difficulty_level: Database["public"]["Enums"]["difficulty_level"]
          estimated_minutes: number
          id: string
          planning_json: Json | null
          price: number
          price_tier: Database["public"]["Enums"]["price_tier"]
          published_at: string | null
          search_tsv: unknown
          slug: string
          status: Database["public"]["Enums"]["course_status"]
          subject_id: string | null
          tags: string[]
          thumbnail_url: string | null
          title: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "courses"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      toggle_discussion_like: {
        Args: { p_discussion_id: string }
        Returns: Json
      }
      track_viewer_analytics_event: {
        Args: {
          p_course_id: string
          p_event_type: Database["public"]["Enums"]["viewer_analytics_event_type"]
          p_lesson_id?: string
        }
        Returns: boolean
      }
      update_user_streak: { Args: { p_user_id: string }; Returns: undefined }
      upsert_daily_activity: {
        Args: { p_lessons?: number; p_user_id: string; p_xp?: number }
        Returns: undefined
      }
      viewer_can_access_conversation: {
        Args: { p_conversation_id: string }
        Returns: boolean
      }
    }
    Enums: {
      achievement_category: "streak" | "learning" | "social" | "challenge"
      achievement_rarity: "common" | "rare" | "epic" | "legendary"
      app_platform: "ios" | "android" | "web"
      block_type:
        | "text"
        | "image"
        | "code_playground"
        | "multiple_choice"
        | "slider"
        | "info_card"
      community_conversation_kind: "direct" | "group"
      course_status: "draft" | "published" | "archived"
      difficulty_level: "beginner" | "intermediate" | "advanced"
      enrollment_status: "in_progress" | "completed" | "dropped"
      lesson_type: "interactive" | "quiz" | "video" | "article"
      lesson_unlock_type:
        | "none"
        | "prerequisite"
        | "paid"
        | "prerequisite_or_paid"
        | "prerequisite_and_paid"
      price_tier: "free" | "premium"
      subscription_status: "active" | "canceled" | "expired"
      theme_mode: "system" | "light" | "dark"
      user_role: "user" | "subscriber" | "author" | "admin"
      viewer_analytics_event_type: "course_view" | "lesson_started"
      xp_source_type: "lesson_complete" | "daily_bonus" | "admin_adjustment"
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
      achievement_category: ["streak", "learning", "social", "challenge"],
      achievement_rarity: ["common", "rare", "epic", "legendary"],
      app_platform: ["ios", "android", "web"],
      block_type: [
        "text",
        "image",
        "code_playground",
        "multiple_choice",
        "slider",
        "info_card",
      ],
      community_conversation_kind: ["direct", "group"],
      course_status: ["draft", "published", "archived"],
      difficulty_level: ["beginner", "intermediate", "advanced"],
      enrollment_status: ["in_progress", "completed", "dropped"],
      lesson_type: ["interactive", "quiz", "video", "article"],
      lesson_unlock_type: [
        "none",
        "prerequisite",
        "paid",
        "prerequisite_or_paid",
        "prerequisite_and_paid",
      ],
      price_tier: ["free", "premium"],
      subscription_status: ["active", "canceled", "expired"],
      theme_mode: ["system", "light", "dark"],
      user_role: ["user", "subscriber", "author", "admin"],
      viewer_analytics_event_type: ["course_view", "lesson_started"],
      xp_source_type: ["lesson_complete", "daily_bonus", "admin_adjustment"],
    },
  },
} as const
