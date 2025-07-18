import { supabaseAdmin } from './supabase'

/**
 * Get user credits by email
 */
export async function getUserCredits(email: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('id, email, credits')
      .eq('email', email.toLowerCase())
      .single()

    if (error && error.code !== 'PGRST116') {
      throw error
    }

    return {
      success: true,
      user: data,
      credits: data?.credits || 0
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get credits'
    }
  }
}

/**
 * Deduct credits from user (when they use the service)
 */
export async function deductCredits(email: string, amount: number = 1) {
  try {
    const userResult = await getUserCredits(email)
    
    if (!userResult.success || !userResult.user) {
      throw new Error('User not found')
    }

    const currentCredits = userResult.user.credits
    
    if (currentCredits < amount) {
      return {
        success: false,
        error: 'Insufficient credits',
        currentCredits
      }
    }

    const newCredits = currentCredits - amount

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ 
        credits: newCredits,
        updated_at: new Date().toISOString()
      })
      .eq('id', userResult.user.id)
      .select()

    if (error) {
      throw error
    }

    return {
      success: true,
      previousCredits: currentCredits,
      newCredits,
      deducted: amount,
      user: data?.[0]
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to deduct credits'
    }
  }
}

/**
 * Check if user has enough credits
 */
export async function hasCredits(email: string, required: number = 1) {
  const result = await getUserCredits(email)
  return result.success && (result.credits >= required)
}

/**
 * Development function: manually add credits to a user
 */
export async function addTestCredits(email: string, amount: number) {
  try {
    // First, try to find existing user
    const { data: existingUser, error: findError } = await supabaseAdmin
      .from('users')
      .select('id, email, credits')
      .eq('email', email.toLowerCase())
      .single()

    if (findError && findError.code !== 'PGRST116') {
      throw findError
    }

    if (existingUser) {
      // User exists, update credits
      const newCredits = existingUser.credits + amount
      
      const { data, error: updateError } = await supabaseAdmin
        .from('users')
        .update({ 
          credits: newCredits,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id)
        .select()

      if (updateError) {
        throw updateError
      }

      return {
        success: true,
        action: 'updated',
        previousCredits: existingUser.credits,
        newCredits,
        added: amount,
        user: data?.[0]
      }
    } else {
      // User doesn't exist, create new user
      const { data, error: insertError } = await supabaseAdmin
        .from('users')
        .insert({
          email: email.toLowerCase(),
          credits: amount
        })
        .select()

      if (insertError) {
        throw insertError
      }

      return {
        success: true,
        action: 'created',
        newCredits: amount,
        added: amount,
        user: data?.[0]
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to add test credits'
    }
  }
} 