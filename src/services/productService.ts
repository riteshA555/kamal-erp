import { supabase } from '../supabaseClient'
import { Product } from '../types'
import { cacheStore } from './cacheStore'

const PRODUCTS_CACHE_KEY = 'products_list'

export const getProducts = async () => {
    const cached = cacheStore.get(PRODUCTS_CACHE_KEY)
    if (cached) {
        fetchFreshProducts()
        return cached as Product[]
    }
    return fetchFreshProducts()
}

const fetchFreshProducts = async () => {
    const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name')

    if (error) throw error
    cacheStore.set(PRODUCTS_CACHE_KEY, data)
    return data as Product[]
}

export const updateProduct = async (id: string, updates: Partial<Product>) => {
    const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
    if (error) throw error
    cacheStore.invalidate(PRODUCTS_CACHE_KEY)
}

export const deleteProduct = async (id: string) => {
    const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', id)
    if (error) throw error
    cacheStore.invalidate(PRODUCTS_CACHE_KEY)
}

export const addProduct = async (product: Omit<Product, 'id' | 'created_at'>) => {
    // 1. Create the product first with stock 0 to ensure we have an ID
    const initialStock = product.current_stock || 0
    const { data: productData, error: productError } = await supabase
        .from('products')
        .insert([{ ...product, current_stock: 0 }])
        .select()

    if (productError) throw productError
    const newProduct = productData[0] as Product

    // 2. If there is opening stock, create a stock transaction atomically
    if (initialStock > 0) {
        const { data: stockData, error: stockError } = await supabase.rpc('add_stock_entry_atomic', {
            p_date: new Date().toISOString(),
            p_type: 'RAW_IN',
            p_item_type: 'FINISHED_GOODS',
            p_quantity: initialStock,
            p_weight_gm: (product.default_weight || 0) * initialStock,
            p_product_id: newProduct.id,
            p_note: 'Opening Stock Initialization',
            p_source: 'Catalogue',
            p_rate_at_time: 0,
            p_wastage_percent: product.wastage_percent || 0
        })

        if (stockError) {
            console.error("Initial stock failed:", stockError)
            throw new Error(`Failed to add opening stock: ${stockError.message}`)
        }

        // Invalidate stock-related caches since we added stock
        cacheStore.invalidatePattern('stock_')
    }

    cacheStore.invalidate(PRODUCTS_CACHE_KEY)
    return newProduct
}
