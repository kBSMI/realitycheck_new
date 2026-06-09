import type { Testimonial } from '../../types/realityCheck';
import type { TestimonialRepository } from '../../types/production';
import { cloudPersistenceAvailable, getSessionSnapshot, getSupabaseClient } from '../../lib/supabaseClient';
import { localList, localUpsert } from './localRepositoryStore';

const TESTIMONIAL_KEY = 'arc_repo_testimonials';

interface TestimonialRow {
  id: string;
  user_id?: string;
  reality_check_id: string;
  payload: Testimonial;
  created_at: string;
}

function shouldUseCloud(userId?: string): boolean {
  return Boolean(userId && cloudPersistenceAvailable());
}

export function createTestimonialRepository(): TestimonialRepository {
  return {
    async saveTestimonial(testimonial) {
      const userId = getSessionSnapshot()?.user?.id;
      const client = getSupabaseClient();
      if (shouldUseCloud(userId) && client) {
        await client.from('testimonials').upsert({
          id: testimonial.id,
          user_id: userId,
          reality_check_id: testimonial.checkId,
          payload: testimonial,
          created_at: testimonial.createdAt,
        });
      }
      return localUpsert(TESTIMONIAL_KEY, testimonial);
    },

    async listTestimonials(userId) {
      const client = getSupabaseClient();
      if (shouldUseCloud(userId) && client) {
        const { data } = await client
          .from('testimonials')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
          .returns<TestimonialRow[]>();
        if (data) return data.map((row) => row.payload);
      }
      return localList<Testimonial>(TESTIMONIAL_KEY);
    },
  };
}

export const testimonialRepository = createTestimonialRepository();
